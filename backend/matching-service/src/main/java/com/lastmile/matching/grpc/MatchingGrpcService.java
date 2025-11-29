package com.lastmile.matching.grpc;

import com.lastmile.matching.model.Match;
import com.lastmile.matching.proto.*;
import com.lastmile.matching.repository.MatchRepository;
import com.lastmile.driver.proto.*;
import com.lastmile.station.proto.*;
import com.lastmile.trip.proto.*;
import com.lastmile.notification.proto.*;
import com.lastmile.rider.proto.*;
import io.grpc.Metadata;
import io.grpc.stub.AbstractStub;
import io.grpc.stub.MetadataUtils;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.client.inject.GrpcClient;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;

@GrpcService
public class MatchingGrpcService extends MatchingServiceGrpc.MatchingServiceImplBase {
    
    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @Autowired
    private org.springframework.data.redis.listener.RedisMessageListenerContainer redisMessageListenerContainer;

    @GrpcClient("driver-service")
    private DriverServiceGrpc.DriverServiceBlockingStub driverStub;
    
    @GrpcClient("trip-service")
    private TripServiceGrpc.TripServiceBlockingStub tripStub;

    @GrpcClient("station-service")
    private StationServiceGrpc.StationServiceBlockingStub stationStub;

    @GrpcClient("notification-service")
    private NotificationServiceGrpc.NotificationServiceBlockingStub notificationStub;

    @GrpcClient("rider-service")
    private RiderServiceGrpc.RiderServiceBlockingStub riderStub;

    private <T extends AbstractStub<T>> T attachToken(T stub) {
        String token = AuthInterceptor.AUTH_TOKEN_KEY.get();
        if (token == null) return stub;
        Metadata headers = new Metadata();
        headers.put(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER), "Bearer " + token);
        return MetadataUtils.attachHeaders(stub, headers);
    }

    private void publishMatchUpdate(String riderId, String matchId, String status, String driverId, String tripId) {
        String channel = "match-status:" + riderId;
        String message = matchId + "," + status + "," + (driverId != null ? driverId : "") + "," + (tripId != null ? tripId : "");
        redisTemplate.convertAndSend(channel, message);
    }

    private void publishDriverMatchRequest(String driverId, String matchId, String riderId, String pickup, String dest, int fare) {
        String channel = "driver-dashboard:" + driverId;
        String message = "MATCH_REQUEST," + matchId + "::" + riderId + "::" + pickup + "::" + fare + "::" + dest;
        System.out.println("DEBUG: Publishing MATCH_REQUEST to " + channel + ": " + message);
        redisTemplate.convertAndSend(channel, message);
    }
    
    @Override
    public void matchRiderWithDriver(MatchRiderWithDriverRequest request,
                                    StreamObserver<MatchRiderWithDriverResponse> responseObserver) {
        String riderId = request.getRiderId();
        String metroStation = request.getMetroStation();
        String destination = request.getDestination();
        String rideRequestId = request.getRideRequestId();
        
        MatchRiderWithDriverResponse.Builder responseBuilder = MatchRiderWithDriverResponse.newBuilder();
        
        try {
            com.lastmile.driver.proto.DriverInfo matchedDriver = findDriver(metroStation, destination, null);
            
            if (matchedDriver == null) {
                responseBuilder.setSuccess(false)
                        .setMessage("No matching driver found");
            } else {
                String matchId = rideRequestId;
                if (matchId == null || matchId.isEmpty()) {
                    responseBuilder.setSuccess(false)
                            .setMessage("ride_request_id is required");
                    responseObserver.onNext(responseBuilder.build());
                    responseObserver.onCompleted();
                    return;
                }
                int fare = calculateFare(metroStation, matchedDriver);
                
                Match match = new Match();
                match.setMatchId(matchId);
                match.setDriverId(matchedDriver.getDriverId());
                match.setRiderId(riderId);
                match.setPickupStation(metroStation);
                match.setFare(fare);
                match.setDestination(destination);
                match.setStatus("MATCHED");
                match.setTimestamp(System.currentTimeMillis());
                matchRepository.save(match);

                notifyDriver(matchedDriver.getDriverId(), riderId, matchId);
                publishMatchUpdate(riderId, matchId, "MATCHED", matchedDriver.getDriverId(), null);
                publishDriverMatchRequest(matchedDriver.getDriverId(), matchId, riderId, metroStation, destination, fare);
                
                responseBuilder.setMatchId(matchId)
                        .setDriverId(matchedDriver.getDriverId())
                        .setSuccess(true)
                        .setMessage("Match found, waiting for driver confirmation");
            }
        } catch (Exception e) {
            responseBuilder.setSuccess(false)
                    .setMessage("Error matching: " + e.getMessage());
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void monitorMatchStatus(MonitorMatchStatusRequest request,
                                   StreamObserver<MonitorMatchStatusResponse> responseObserver) {
        String riderId = request.getRiderId();
        String channel = "match-status:" + riderId;
        
        io.grpc.stub.ServerCallStreamObserver<MonitorMatchStatusResponse> serverObserver = 
            (io.grpc.stub.ServerCallStreamObserver<MonitorMatchStatusResponse>) responseObserver;

        org.springframework.data.redis.connection.MessageListener listener = (message, pattern) -> {
            String body = new String(message.getBody());
            String[] parts = body.split(",");
            if (parts.length >= 2) {
                try {
                    String matchId = parts[0];
                    String statusStr = parts[1];
                    String driverId = parts.length > 2 ? parts[2] : "";
                    String tripId = parts.length > 3 ? parts[3] : "";
                    
                    MatchStatus status = MatchStatus.PENDING;
                    try { status = MatchStatus.valueOf(statusStr); } catch (Exception e) {}

                    MonitorMatchStatusResponse response = MonitorMatchStatusResponse.newBuilder()
                            .setMatchId(matchId)
                            .setStatus(status)
                            .setDriverId(driverId)
                            .setTripId(tripId)
                            .setSuccess(true)
                            .build();
                            
                    synchronized (responseObserver) {
                        responseObserver.onNext(response);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        };

        redisMessageListenerContainer.addMessageListener(listener, new org.springframework.data.redis.listener.ChannelTopic(channel));

        serverObserver.setOnCancelHandler(() -> {
            redisMessageListenerContainer.removeMessageListener(listener);
        });
    }


    @Override
    public void acceptMatch(AcceptMatchRequest request, StreamObserver<AcceptMatchResponse> responseObserver) {
        String matchId = request.getMatchId();
        String driverId = request.getDriverId();
        
        AcceptMatchResponse.Builder responseBuilder = AcceptMatchResponse.newBuilder();
        
        try {
            Optional<Match> matchOpt = matchRepository.findById(matchId);
            if (matchOpt.isPresent()) {
                Match match = matchOpt.get();
                if (match.getStatus().equals("MATCHED") && match.getDriverId().equals(driverId)) {
                    
                    CreateTripRequest tripRequest = CreateTripRequest.newBuilder()
                            .setDriverId(match.getDriverId())
                            .setRiderId(match.getRiderId())
                            .setPickupStation(match.getPickupStation())
                            .setDestination(match.getDestination())
                            .setMatchId(matchId)
                            .setFare(match.getFare())
                            .build();
                    
                    CreateTripResponse tripResponse = attachToken(tripStub).createTrip(tripRequest);
                    
                    if (tripResponse.getSuccess()) {
                        match.setStatus("CONFIRMED");
                        matchRepository.save(match);
                        publishMatchUpdate(match.getRiderId(), matchId, "CONFIRMED", match.getDriverId(), tripResponse.getTripId());
                        
                        responseBuilder.setSuccess(true)
                                .setMessage("Match accepted and trip created");
                    } else {
                        responseBuilder.setSuccess(false)
                                .setMessage("Failed to create trip: " + tripResponse.getMessage());
                    }
                } else {
                     responseBuilder.setSuccess(false).setMessage("Match not valid for acceptance");
                }
            } else {
                responseBuilder.setSuccess(false).setMessage("Match not found");
            }
        } catch (Exception e) {
            responseBuilder.setSuccess(false).setMessage("Error accepting match: " + e.getMessage());
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void declineMatch(DeclineMatchRequest request, StreamObserver<DeclineMatchResponse> responseObserver) {
        String matchId = request.getMatchId();
        String driverId = request.getDriverId();
        
        DeclineMatchResponse.Builder responseBuilder = DeclineMatchResponse.newBuilder();
        
        try {
            Optional<Match> matchOpt = matchRepository.findById(matchId);
            if (matchOpt.isPresent()) {
                Match match = matchOpt.get();
                if (match.getStatus().equals("MATCHED") && match.getDriverId().equals(driverId)) {
                    
                    // Try to find a new driver
                    com.lastmile.driver.proto.DriverInfo newDriver = findDriver(match.getPickupStation(), match.getDestination(), driverId);
                    
                    if (newDriver != null) {
                        // Update existing match with new driver
                        match.setDriverId(newDriver.getDriverId());
                        match.setFare(calculateFare(match.getPickupStation(), newDriver));
                        match.setStatus("MATCHED"); // Reset status to MATCHED
                        match.setTimestamp(System.currentTimeMillis()); // Update timestamp
                        matchRepository.save(match);
                        
                        notifyDriver(newDriver.getDriverId(), match.getRiderId(), matchId);
                        
                        responseBuilder.setSuccess(true).setMessage("Match declined, reassigned to new driver");
                    } else {
                        // No new driver found, cancel match
                        match.setStatus("CANCELLED");
                        matchRepository.save(match);
                        responseBuilder.setSuccess(true).setMessage("Match declined, no new driver found");
                    }
                } else {
                    responseBuilder.setSuccess(false).setMessage("Match not valid for decline");
                }
            } else {
                responseBuilder.setSuccess(false).setMessage("Match not found");
            }
        } catch (Exception e) {
            responseBuilder.setSuccess(false).setMessage("Error declining match: " + e.getMessage());
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void getMatchStatus(GetMatchStatusRequest request,
                              StreamObserver<GetMatchStatusResponse> responseObserver) {
        String matchId = request.getMatchId();
        
        GetMatchStatusResponse.Builder responseBuilder = GetMatchStatusResponse.newBuilder();
        
        Optional<Match> matchOpt = matchRepository.findById(matchId);
        
        if (matchOpt.isPresent()) {
            Match match = matchOpt.get();
            responseBuilder.setMatchId(match.getMatchId())
                    .setDriverId(match.getDriverId())
                    .setRiderId(match.getRiderId())
                    .setStatus(convertStatus(match.getStatus()))
                    .setSuccess(true);
        } else {
            responseBuilder.setSuccess(false);
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void cancelMatchRequestByRider(CancelMatchRequest request,
                                         StreamObserver<CancelMatchResponse> responseObserver) {
        String matchId = request.getMatchId();
        String riderId = request.getRiderId();
        System.out.println("DEBUG: Received CancelMatchRequestByRider for matchId: " + matchId + ", riderId: " + riderId);
        long startTime = System.currentTimeMillis();
        
        CancelMatchResponse.Builder responseBuilder = CancelMatchResponse.newBuilder();
        
        try {
            Optional<Match> matchOpt = matchRepository.findById(matchId);
            if (matchOpt.isPresent()) {
                Match match = matchOpt.get();
                match.setStatus("CANCELLED");
                matchRepository.save(match);
                publishMatchUpdate(riderId, matchId, "CANCELLED", null, null);
                responseBuilder.setSuccess(true)
                        .setMessage("Match cancelled successfully"); 

                // call CancelRideRequest in rider service
                try {
                    attachToken(riderStub).cancelRideRequest(
                        CancelRideRequestRequest.newBuilder()
                            .setRiderId(riderId)
                            .build()
                    );
                    System.out.println("DEBUG: Called riderStub.cancelRideRequest");
                } catch (Exception e) {
                    System.err.println("DEBUG: Failed to cancel ride request in RiderService: " + e.getMessage());
                }
                
            } 
            else {
                responseBuilder.setSuccess(false)
                        .setMessage("Match not found");
            }
            
            long duration = System.currentTimeMillis() - startTime;
            System.out.println("DEBUG: CancelMatchRequestByRider completed in " + duration + "ms");

        } catch (Exception e) {
            System.err.println("DEBUG: Error cancelling match: " + e.getMessage());
            responseBuilder.setSuccess(false)
                    .setMessage("Error cancelling match: " + e.getMessage());
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }
    
    private com.lastmile.matching.proto.MatchStatus convertStatus(String status) {
        if (status == null) return com.lastmile.matching.proto.MatchStatus.PENDING;
        try {
            return com.lastmile.matching.proto.MatchStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return com.lastmile.matching.proto.MatchStatus.PENDING;
        }
    }

    private com.lastmile.driver.proto.DriverInfo findDriver(String pickupStation, String destination, String excludeDriverId) {
        System.out.println("DEBUG: Finding driver for station: " + pickupStation + ", destination: " + destination);
        try {
            ListDriversRequest listRequest = ListDriversRequest.newBuilder()
                .setStation(pickupStation)
                .build();
                
            com.lastmile.driver.proto.ListDriversResponse listResponse = attachToken(driverStub).listDrivers(listRequest);
            
            if (listResponse.getSuccess()) {
                System.out.println("DEBUG: Found " + listResponse.getDriversCount() + " drivers at station " + pickupStation);
                for (com.lastmile.driver.proto.DriverInfo driver : listResponse.getDriversList()) {
                    System.out.println("DEBUG: Checking driver: " + driver.getDriverId() + ", Dest: " + driver.getDestination() + ", Seats: " + driver.getAvailableSeats());
                    
                    String driverDest = driver.getDestination().toLowerCase();
                    String riderDest = destination.toLowerCase();
                    
                    // Relaxed matching: check if one contains the other
                    boolean destMatch = driverDest.equals(riderDest) || driverDest.contains(riderDest) || riderDest.contains(driverDest);
                    
                    if (destMatch &&
                        driver.getAvailableSeats() > 0 &&
                        driver.getMetroStationsList().contains(pickupStation)) {
                        
                        if (excludeDriverId == null || !driver.getDriverId().equals(excludeDriverId)) {
                            System.out.println("DEBUG: >> Match found: " + driver.getDriverId());
                            return driver;
                        }
                    } else {
                         System.out.println("DEBUG: >> Driver " + driver.getDriverId() + " did not match. DestMatch: " + destMatch);
                    }
                }
            } else {
                System.out.println("DEBUG: ListDrivers failed: " + listResponse.getSuccess());
            }
        } catch (Exception e) {
            System.err.println("DEBUG: Error finding driver: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }

    private int calculateFare(String pickupStation, com.lastmile.driver.proto.DriverInfo driver) {
        int fare = 50;
        try {
            GetStationInfoResponse stationInfo = attachToken(stationStub).getStationInfo(
                GetStationInfoRequest.newBuilder().setStationId(pickupStation).build()
            );
            
            if (stationInfo.getSuccess() && driver.hasCurrentLocation()) {
                double stationLat = stationInfo.getStation().getLatitude();
                double stationLon = stationInfo.getStation().getLongitude();
                double driverLat = driver.getCurrentLocation().getLatitude();
                double driverLon = driver.getCurrentLocation().getLongitude();
                
                double rawFare = Math.abs(driverLat - stationLat) + Math.abs(driverLon - stationLon);
                fare = (int) (rawFare * 10000);
                if (fare < 10) fare = 10; 
            }
        } catch (Exception e) {
            System.err.println("Error calculating fare: " + e.getMessage());
        }
        return fare;
    }

    private void notifyDriver(String driverId, String riderId, String matchId) {
        System.out.println("DEBUG: Notifying driver: " + driverId + ", rider: " + riderId + ", match: " + matchId);
        try {
            attachToken(notificationStub).sendMatchNotification(
                SendMatchNotificationRequest.newBuilder()
                    .setDriverId(driverId)
                    .setRiderId(riderId)
                    .setMatchId(matchId)
                    .build()
            );
        } catch (Exception e) {
            System.err.println("Failed to notify driver: " + e.getMessage());
        }
    }
}


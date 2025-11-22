package com.lastmile.station.grpc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lastmile.station.proto.*;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.*;
import java.util.stream.Collectors;

@GrpcService
public class StationGrpcService extends StationServiceGrpc.StationServiceImplBase {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String REDIS_KEY = "bangalore_metro_stations";
    private static final double SEARCH_RADIUS_KM = 3.0;

    // =======================================================================
    // 1. GET STATIONS ALONG ROUTE (Filter by Radius)
    // =======================================================================
    @Override
    public void getStationsAlongRoute(GetStationsAlongRouteRequest request,
                                      StreamObserver<GetStationsAlongRouteResponse> responseObserver) {

        System.out.println("\n====== [GetStationsAlongRoute] START ======");
        System.out.println("Origin: " + request.getOrigin());
        System.out.println("Destination: " + request.getDestination());
        System.out.println("Route Points Received: " + request.getRoutePointsCount());

        // 1. Fetch all stations from Redis
        List<Station> allStations = fetchStationsFromRedis();
        System.out.println("Fetched " + allStations.size() + " total stations from Redis.");

        Set<Station> nearbyStations = new HashSet<>();
        List<LatLng> routePoints = request.getRoutePointsList();

        // 2. Brute-force check: Is any route point within 3KM of a station?
        // (Optimization: For production, use spatial indexing like GeoHash, but loop is fine for <100 stations)
        
        int checksPerformed = 0;
        for (Station station : allStations) {
            boolean isNearby = false;
            
            // Check this station against every point in the route
            for (LatLng point : routePoints) {
                double distance = calculateDistance(
                        point.getLatitude(), point.getLongitude(),
                        station.getLatitude(), station.getLongitude()
                );
                
                // If distance is within radius
                if (distance <= SEARCH_RADIUS_KM) {
                    isNearby = true;
                    break; // Found a point close enough, no need to check other points for this station
                }
            }
            
            if (isNearby) {
                nearbyStations.add(station);
            }
        }

        System.out.println("Found " + nearbyStations.size() + " unique stations within " + SEARCH_RADIUS_KM + "km of the route.");

        // 3. Build Response
        GetStationsAlongRouteResponse.Builder responseBuilder = GetStationsAlongRouteResponse.newBuilder();
        
        if (nearbyStations.isEmpty()) {
            responseBuilder.setSuccess(false)
                    .setMessage("No metro stations found within 3km of this route.");
        } else {
            responseBuilder.addAllStations(nearbyStations);
            responseBuilder.setSuccess(true)
                    .setMessage("Found " + nearbyStations.size() + " stations along the route.");
        }

        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
        System.out.println("====== [GetStationsAlongRoute] END ======\n");
    }

    // =======================================================================
    // 2. GET STATION INFO (Find by Name/ID)
    // =======================================================================
    @Override
    public void getStationInfo(GetStationInfoRequest request,
                               StreamObserver<GetStationInfoResponse> responseObserver) {
        
        String requestedId = request.getStationId(); // In this implementation, we assume ID = Name
        System.out.println("\n====== [GetStationInfo] Looking for: " + requestedId + " ======");

        List<Station> allStations = fetchStationsFromRedis();
        
        // Find matching station (Ignoring case)
        Optional<Station> match = allStations.stream()
                .filter(s -> s.getStationId().equalsIgnoreCase(requestedId) || s.getName().equalsIgnoreCase(requestedId))
                .findFirst();

        GetStationInfoResponse.Builder responseBuilder = GetStationInfoResponse.newBuilder();

        if (match.isPresent()) {
            System.out.println("Station found: " + match.get().getName());
            responseBuilder.setStation(match.get())
                    .setSuccess(true);
        } else {
            System.out.println("Station NOT found.");
            responseBuilder.setSuccess(false);
        }

        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
        System.out.println("====== [GetStationInfo] END ======\n");
    }

    // =======================================================================
    // 3. GET ALL STATIONS (Dump Redis)
    // =======================================================================
    @Override
    public void getAllStations(GetAllStationsRequest request,
                               StreamObserver<GetAllStationsResponse> responseObserver) {
        
        System.out.println("\n====== [GetAllStations] Fetching all... ======");
        
        List<Station> stations = fetchStationsFromRedis();
        
        System.out.println("Returning " + stations.size() + " stations to client.");

        GetAllStationsResponse response = GetAllStationsResponse.newBuilder()
                .addAllStations(stations)
                .setSuccess(true)
                .build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
        System.out.println("====== [GetAllStations] END ======\n");
    }


    // =======================================================================
    // HELPER METHODS
    // =======================================================================

    /**
     * Reads the List from Redis key "bangalore_metro_stations" and converts JSON -> Proto Objects
     */
    private List<Station> fetchStationsFromRedis() {
        List<Station> protoStations = new ArrayList<>();
        
        try {
            // 1. Get list from Redis (0 to -1 means all elements)
            List<String> jsonList = redisTemplate.opsForList().range(REDIS_KEY, 0, -1);

            if (jsonList == null || jsonList.isEmpty()) {
                System.err.println("Redis list '" + REDIS_KEY + "' is empty!");
                return protoStations;
            }

            // 2. Parse each JSON string
            for (String json : jsonList) {
                try {
                    RedisStationDto dto = objectMapper.readValue(json, RedisStationDto.class);
                    
                    // Build Proto Object
                    // Note: Since Redis JSON doesn't have an ID, we use the Name as the ID
                    Station station = Station.newBuilder()
                            .setStationId(dto.name) 
                            .setName(dto.name)
                            .setLatitude(dto.location.lat)
                            .setLongitude(dto.location.lng)
                            .setLine("Namma Metro") // Default value as API doesn't provide line info
                            .setOrder(0)            // Default value
                            .build();

                    protoStations.add(station);
                } catch (Exception e) {
                    System.err.println("Failed to parse station JSON: " + json);
                    e.printStackTrace();
                }
            }
        } catch (Exception e) {
            System.err.println("Error connecting to Redis: " + e.getMessage());
        }
        
        return protoStations;
    }

    /**
     * Haversine formula to calculate distance between two coordinates in KM
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }

    // Inner class to map the Redis JSON structure
    // JSON Example: {"name": "...", "address": "...", "location": {"lat": 12.3, "lng": 77.1}}
    private static class RedisStationDto {
        public String name;
        public String address;
        public Location location;

        public static class Location {
            public double lat;
            public double lng;
        }
    }
}
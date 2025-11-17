package com.lastmile.driver.grpc;

import com.lastmile.driver.model.Driver;
import com.lastmile.driver.proto.*;
import com.lastmile.driver.repository.DriverRepository;
import com.lastmile.station.proto.StationServiceGrpc;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.client.inject.GrpcClient;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;

@GrpcService
public class DriverGrpcService extends DriverServiceGrpc.DriverServiceImplBase {
    
    @Autowired
    private DriverRepository driverRepository;
    
    @GrpcClient("station-service")
    private StationServiceGrpc.StationServiceBlockingStub stationStub;
    
    @Override
    public void registerRoute(RegisterRouteRequest request,
                             StreamObserver<RegisterRouteResponse> responseObserver) {
        String driverId = request.getDriverId();
        String originStation = request.getOriginStation();
        String destination = request.getDestination();
        int availableSeats = request.getAvailableSeats();
        List<String> metroStations = new ArrayList<>(request.getMetroStationsList());
        
        List<String> routeStations = new ArrayList<>();
        
        try {
            com.lastmile.station.proto.GetStationsAlongRouteRequest stationRequest =
                    com.lastmile.station.proto.GetStationsAlongRouteRequest.newBuilder()
                            .setOrigin(originStation)
                            .setDestination(destination)
                            .build();
            
            com.lastmile.station.proto.GetStationsAlongRouteResponse stationResponse =
                    stationStub.getStationsAlongRoute(stationRequest);
            
            if (stationResponse.getSuccess()) {
                for (com.lastmile.station.proto.Station station : stationResponse.getStationsList()) {
                    routeStations.add(station.getStationId());
                }
            }
        } catch (Exception e) {
            if (!metroStations.isEmpty()) {
                routeStations = metroStations;
            }
        }
        
        if (routeStations.isEmpty() && !metroStations.isEmpty()) {
            routeStations = metroStations;
        }
        
        Driver driver = new Driver();
        driver.setDriverId(driverId);
        driver.setRouteId(UUID.randomUUID().toString());
        driver.setOriginStation(originStation);
        driver.setDestination(destination);
        driver.setAvailableSeats(availableSeats);
        driver.setMetroStations(routeStations);
        driver.setPickingUp(false);
        
        driver = driverRepository.save(driver);
        
        RegisterRouteResponse response = RegisterRouteResponse.newBuilder()
                .setRouteId(driver.getRouteId())
                .setSuccess(true)
                .setMessage("Route registered successfully")
                .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
    
    @Override
    public void updateLocation(UpdateLocationRequest request,
                              StreamObserver<UpdateLocationResponse> responseObserver) {
        String driverId = request.getDriverId();
        double latitude = request.getLatitude();
        double longitude = request.getLongitude();
        
        Driver driver = driverRepository.findById(driverId)
                .orElse(null);
        
        if (driver == null) {
            UpdateLocationResponse response = UpdateLocationResponse.newBuilder()
                    .setSuccess(false)
                    .setMessage("Driver not found")
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            return;
        }
        
        Driver.Location location = new Driver.Location();
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setTimestamp(System.currentTimeMillis());
        driver.setCurrentLocation(location);
        
        driverRepository.save(driver);
        
        UpdateLocationResponse response = UpdateLocationResponse.newBuilder()
                .setSuccess(true)
                .setMessage("Location updated successfully")
                .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
    
    @Override
    public void updatePickupStatus(UpdatePickupStatusRequest request,
                                  StreamObserver<UpdatePickupStatusResponse> responseObserver) {
        String driverId = request.getDriverId();
        boolean isPickingUp = request.getIsPickingUp();
        
        Driver driver = driverRepository.findById(driverId)
                .orElse(null);
        
        if (driver == null) {
            UpdatePickupStatusResponse response = UpdatePickupStatusResponse.newBuilder()
                    .setSuccess(false)
                    .setMessage("Driver not found")
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
            return;
        }
        
        driver.setPickingUp(isPickingUp);
        driverRepository.save(driver);
        
        UpdatePickupStatusResponse response = UpdatePickupStatusResponse.newBuilder()
                .setSuccess(true)
                .setMessage("Pickup status updated successfully")
                .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
    
    @Override
    public void getDriverInfo(GetDriverInfoRequest request,
                              StreamObserver<GetDriverInfoResponse> responseObserver) {
        String driverId = request.getDriverId();
        
        Driver driver = driverRepository.findById(driverId)
                .orElse(null);
        
        GetDriverInfoResponse.Builder responseBuilder = GetDriverInfoResponse.newBuilder();
        
        if (driver == null) {
            responseBuilder.setSuccess(false);
        } else {
            responseBuilder.setDriverId(driver.getDriverId())
                    .setOriginStation(driver.getOriginStation())
                    .setDestination(driver.getDestination())
                    .setAvailableSeats(driver.getAvailableSeats())
                    .addAllMetroStations(driver.getMetroStations())
                    .setIsPickingUp(driver.isPickingUp())
                    .setSuccess(true);
            
            if (driver.getCurrentLocation() != null) {
                Location location = Location.newBuilder()
                        .setLatitude(driver.getCurrentLocation().getLatitude())
                        .setLongitude(driver.getCurrentLocation().getLongitude())
                        .setTimestamp(driver.getCurrentLocation().getTimestamp())
                        .build();
                responseBuilder.setCurrentLocation(location);
            }
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }
    
    @Override
    public void listDrivers(ListDriversRequest request,
                           StreamObserver<ListDriversResponse> responseObserver) {
        List<String> driverIds = driverRepository.findAll().stream()
                .map(Driver::getDriverId)
                .toList();
        
        ListDriversResponse response = ListDriversResponse.newBuilder()
                .addAllDriverIds(driverIds)
                .setSuccess(true)
                .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}


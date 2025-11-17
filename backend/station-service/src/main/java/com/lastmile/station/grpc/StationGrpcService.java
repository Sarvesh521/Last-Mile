package com.lastmile.station.grpc;

import com.lastmile.station.model.Station;
import com.lastmile.station.proto.*;
import com.lastmile.station.repository.StationRepository;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;

@GrpcService
public class StationGrpcService extends StationServiceGrpc.StationServiceImplBase {
    
    @Autowired
    private StationRepository stationRepository;
    
    private static final Map<String, List<String>> DESTINATION_TO_STATIONS = new HashMap<>();
    
    static {
        DESTINATION_TO_STATIONS.put("North", Arrays.asList("R1", "R2", "R3"));
        DESTINATION_TO_STATIONS.put("South", Arrays.asList("R3", "R4", "R5"));
        DESTINATION_TO_STATIONS.put("East", Arrays.asList("B1", "B2", "B3"));
        DESTINATION_TO_STATIONS.put("West", Arrays.asList("B2", "B3", "B4"));
        DESTINATION_TO_STATIONS.put("Central", Arrays.asList("G1", "G2", "G3"));
        DESTINATION_TO_STATIONS.put("Downtown", Arrays.asList("R2", "R3", "B1", "B2"));
        DESTINATION_TO_STATIONS.put("Airport", Arrays.asList("R4", "R5", "B3", "B4"));
        DESTINATION_TO_STATIONS.put("Mall", Arrays.asList("G2", "G3", "B1"));
    }
    
    @Override
    public void getStationsAlongRoute(GetStationsAlongRouteRequest request,
                                     StreamObserver<GetStationsAlongRouteResponse> responseObserver) {
        String origin = request.getOrigin();
        String destination = request.getDestination();
        
        List<Station> stationsList = new ArrayList<>();
        
        if (destination != null && DESTINATION_TO_STATIONS.containsKey(destination)) {
            List<String> stationIds = DESTINATION_TO_STATIONS.get(destination);
            for (String stationId : stationIds) {
                Optional<Station> stationOpt = stationRepository.findById(stationId);
                if (stationOpt.isPresent()) {
                    stationsList.add(stationOpt.get());
                }
            }
        }
        
        GetStationsAlongRouteResponse.Builder responseBuilder = GetStationsAlongRouteResponse.newBuilder();
        
        if (stationsList.isEmpty()) {
            responseBuilder.setSuccess(false)
                    .setMessage("No stations found for destination: " + destination);
        } else {
            for (Station station : stationsList) {
                com.lastmile.station.proto.Station stationProto = com.lastmile.station.proto.Station.newBuilder()
                        .setStationId(station.getStationId())
                        .setName(station.getName())
                        .setLatitude(station.getLatitude())
                        .setLongitude(station.getLongitude())
                        .setLine(station.getLine())
                        .setOrder(station.getOrder())
                        .build();
                responseBuilder.addStations(stationProto);
            }
            responseBuilder.setSuccess(true)
                    .setMessage("Found " + stationsList.size() + " stations for destination: " + destination);
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }
    
    @Override
    public void getStationInfo(GetStationInfoRequest request,
                              StreamObserver<GetStationInfoResponse> responseObserver) {
        String stationId = request.getStationId();
        
        Optional<Station> stationOpt = stationRepository.findById(stationId);
        
        GetStationInfoResponse.Builder responseBuilder = GetStationInfoResponse.newBuilder();
        
        if (stationOpt.isPresent()) {
            Station station = stationOpt.get();
            com.lastmile.station.proto.Station stationProto = com.lastmile.station.proto.Station.newBuilder()
                    .setStationId(station.getStationId())
                    .setName(station.getName())
                    .setLatitude(station.getLatitude())
                    .setLongitude(station.getLongitude())
                    .setLine(station.getLine())
                    .setOrder(station.getOrder())
                    .build();
            responseBuilder.setStation(stationProto).setSuccess(true);
        } else {
            responseBuilder.setSuccess(false);
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }
    
    @Override
    public void getAllStations(GetAllStationsRequest request,
                              StreamObserver<GetAllStationsResponse> responseObserver) {
        List<Station> stations = stationRepository.findAll();
        
        GetAllStationsResponse.Builder responseBuilder = GetAllStationsResponse.newBuilder();
        
        for (Station station : stations) {
            com.lastmile.station.proto.Station stationProto = com.lastmile.station.proto.Station.newBuilder()
                    .setStationId(station.getStationId())
                    .setName(station.getName())
                    .setLatitude(station.getLatitude())
                    .setLongitude(station.getLongitude())
                    .setLine(station.getLine())
                    .setOrder(station.getOrder())
                    .build();
            responseBuilder.addStations(stationProto);
        }
        
        responseBuilder.setSuccess(true);
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }
}


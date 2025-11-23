package com.lastmile.rider.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.*;

@Data
@Document(collection = "riders")
public class Rider {
    @Id
    private String riderId;
    private double rating; 
    private int totalRides; 
    private List<RideRequest> rideHistory;
    private RideRequest currentRideRequest;

    @Data
    public static class RideRequest {
        private String rideRequestId;
        private String metroStation;
        private String destination;
        private long requestTime; //time at which ride was requested
        private long arrivalTime;
        private long dropoffTime;
        private RideStatus status;
        private String driverId;
        private String tripId;
        
        public enum RideStatus {
            PENDING, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED
        }
    }
}

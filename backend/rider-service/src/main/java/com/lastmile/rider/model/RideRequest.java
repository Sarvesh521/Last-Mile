package com.lastmile.rider.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "ride_requests")
public class RideRequest {
    @Id
    private String rideRequestId;
    private String riderId;
    private String metroStation;
    private String destination;
    private long arrivalTime;
    private RideStatus status;
    private String driverId;
    private String tripId;
    
    public enum RideStatus {
        PENDING, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED
    }
}


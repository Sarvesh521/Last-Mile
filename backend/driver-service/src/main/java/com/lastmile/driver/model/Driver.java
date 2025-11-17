package com.lastmile.driver.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document(collection = "drivers")
public class Driver {
    @Id
    private String driverId;
    private String routeId;
    private String originStation;
    private String destination;
    private int availableSeats;
    private List<String> metroStations;
    private boolean isPickingUp;
    private Location currentLocation;
    
    @Data
    public static class Location {
        private double latitude;
        private double longitude;
        private long timestamp;
    }
}


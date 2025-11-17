package com.lastmile.station.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "stations")
public class Station {
    @Id
    private String stationId;
    private String name;
    private double latitude;
    private double longitude;
    private String line;
    private int order;
}


package com.lastmile.station.config;

import com.lastmile.station.model.Station;
import com.lastmile.station.repository.StationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {
    
    @Autowired
    private StationRepository stationRepository;
    
    @Override
    public void run(String... args) {
        if (stationRepository.count() == 0) {
            List<Station> stations = Arrays.asList(
                createStation("R1", "Station A", 28.6139, 77.2090, "Red", 1),
                createStation("R2", "Station B", 28.6140, 77.2100, "Red", 2),
                createStation("R3", "Station C", 28.6141, 77.2110, "Red", 3),
                createStation("R4", "Station D", 28.6142, 77.2120, "Red", 4),
                createStation("R5", "Station E", 28.6143, 77.2130, "Red", 5),
                createStation("B1", "Station F", 28.6200, 77.2200, "Blue", 1),
                createStation("B2", "Station G", 28.6210, 77.2210, "Blue", 2),
                createStation("B3", "Station H", 28.6220, 77.2220, "Blue", 3),
                createStation("B4", "Station I", 28.6230, 77.2230, "Blue", 4),
                createStation("G1", "Station J", 28.6300, 77.2300, "Green", 1),
                createStation("G2", "Station K", 28.6310, 77.2310, "Green", 2),
                createStation("G3", "Station L", 28.6320, 77.2320, "Green", 3)
            );
            stationRepository.saveAll(stations);
        }
    }
    
    private Station createStation(String id, String name, double lat, double lon, String line, int order) {
        Station station = new Station();
        station.setStationId(id);
        station.setName(name);
        station.setLatitude(lat);
        station.setLongitude(lon);
        station.setLine(line);
        station.setOrder(order);
        return station;
    }
}


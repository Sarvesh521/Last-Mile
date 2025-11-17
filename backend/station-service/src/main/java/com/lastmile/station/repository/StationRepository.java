package com.lastmile.station.repository;

import com.lastmile.station.model.Station;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StationRepository extends MongoRepository<Station, String> {
    List<Station> findByLine(String line);
}


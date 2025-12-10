package com.lastmile.matching.repository;

import com.lastmile.matching.model.Match;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchRepository extends MongoRepository<Match, String> {
    java.util.List<Match> findByStatus(String status);
    long countByDriverIdAndStatus(String driverId, String status);
}

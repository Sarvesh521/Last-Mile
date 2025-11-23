package com.lastmile.rider.repository;

import com.lastmile.rider.model.Rider;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiderRepository extends MongoRepository<Rider, String> {
}

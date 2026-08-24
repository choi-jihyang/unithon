package com.unithon.backend.repository;

import com.unithon.backend.entity.Relationship;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RelationshipRepository extends JpaRepository<Relationship, Long> {
}

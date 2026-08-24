package com.unithon.backend.repository;

import com.unithon.backend.entity.Node;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NodeRepository extends JpaRepository<Node, Long> {
}

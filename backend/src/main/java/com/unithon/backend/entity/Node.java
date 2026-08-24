package com.unithon.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "nodes")
@Getter
@Setter
public class Node {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long projectId;

    private String nodeType;

    private Long madeByUserId;

    private String title;

    private String source;

    private String evidenceRef;

    private LocalDateTime madeAt;

    private boolean superseded;
}

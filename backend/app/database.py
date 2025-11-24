"""
Database configuration and models for SQLite storage.
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database setup
DATABASE_URL = "sqlite:///./mouse_breeding.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Database Models
class DBPopulation(Base):
    """Population storage model."""
    __tablename__ = "populations"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=True)
    size = Column(Integer)
    goal_preset = Column(String)
    generation = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mice = relationship("DBMouse", back_populates="population", cascade="all, delete-orphan")


class DBMouse(Base):
    """Mouse storage model."""
    __tablename__ = "mice"
    
    id = Column(String, primary_key=True, index=True)
    population_id = Column(String, ForeignKey("populations.id"), nullable=True)
    generation = Column(Integer)
    sex = Column(String)
    phenotype = Column(Float)
    genome_data = Column(JSON)  # Serialized genome
    pedigree_data = Column(JSON)  # Parent IDs, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    population = relationship("DBPopulation", back_populates="mice")


class DBBreedingRecord(Base):
    """Breeding history record."""
    __tablename__ = "breeding_records"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    parent1_id = Column(String)
    parent2_id = Column(String)
    offspring_ids = Column(JSON)  # List of offspring IDs
    timestamp = Column(DateTime, default=datetime.utcnow)
    cross_type = Column(String)  # "real_data", "simulation", etc.
    gene = Column(String, nullable=True)


class DBValidationResult(Base):
    """Validation test results."""
    __tablename__ = "validation_results"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    method_name = Column(String)
    passed = Column(Integer)  # 0 or 1 (SQLite doesn't have boolean)
    result_data = Column(JSON)  # Full results
    timestamp = Column(DateTime, default=datetime.utcnow)


# Database initialization
def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


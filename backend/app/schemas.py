"""
Pydantic models for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ============================================================================
# BREEDING SCHEMAS
# ============================================================================

class BreedRequest(BaseModel):
    parent1_id: str = Field(..., description="ID of first parent mouse")
    parent2_id: str = Field(..., description="ID of second parent mouse")
    n_offspring: int = Field(1, ge=1, le=10, description="Number of offspring to generate")


class CrossPredictRequest(BaseModel):
    strain1: str = Field(..., description="First strain name (e.g., C57BL/6J)")
    strain2: str = Field(..., description="Second strain name (e.g., DBA/2J)")
    gene: str = Field(..., description="Gene name (e.g., TYRP1, MC1R)")


class MouseSchema(BaseModel):
    id: str
    generation: int
    sex: str
    phenotype: float
    genome_summary: Optional[Dict[str, Any]] = None
    pedigree: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class BreedResponse(BaseModel):
    offspring: List[MouseSchema]
    cross_diagram: str
    genotype_counts: Dict[str, int]
    phenotype_summary: Dict[str, Any]


class CrossPredictResponse(BaseModel):
    strain1: str
    strain2: str
    gene: str
    genotypes: Dict[str, Any]
    phenotypes: Dict[str, Any]
    punnett_square: str
    expected_ratios: Dict[str, float]


# ============================================================================
# POPULATION SCHEMAS
# ============================================================================

class PopulationCreateRequest(BaseModel):
    size: int = Field(..., ge=2, le=1000, description="Population size")
    goal_preset: str = Field("LARGE_FRIENDLY", description="Goal preset name")
    name: Optional[str] = Field(None, description="Optional population name")


class PopulationResponse(BaseModel):
    id: str
    name: Optional[str]
    size: int
    goal_preset: str
    generation: int
    created_at: datetime
    mice_sample: List[MouseSchema]
    
    class Config:
        from_attributes = True


class SelectionRequest(BaseModel):
    top_percent: float = Field(0.2, ge=0.01, le=1.0, description="Fraction of population to select")
    method: str = Field("phenotype", description="Selection method: phenotype, random")


class SelectionResponse(BaseModel):
    selected_count: int
    selected_mice: List[MouseSchema]
    mean_phenotype: float
    selection_differential: float


# ============================================================================
# GENETICS SCHEMAS
# ============================================================================

class GRMRequest(BaseModel):
    mouse_ids: List[str] = Field(..., min_length=2, description="List of mouse IDs")


class GRMResponse(BaseModel):
    grm: List[List[float]]
    mouse_ids: List[str]
    size: int


class InbreedingRequest(BaseModel):
    mouse_ids: List[str] = Field(..., min_length=1, description="List of mouse IDs")


class InbreedingResponse(BaseModel):
    results: List[Dict[str, Any]]
    mean_f_pedigree: float
    mean_f_genomic: float


class HeritabilityRequest(BaseModel):
    population_id: str
    trait: str = Field("phenotype", description="Trait to analyze")


class HeritabilityResponse(BaseModel):
    h2_realized: float
    selection_differential: float
    response: float
    variance_components: Dict[str, float]


# ============================================================================
# VALIDATION SCHEMAS
# ============================================================================

class ValidationMethodResponse(BaseModel):
    method_name: str
    passed: bool
    result_data: Dict[str, Any]
    timestamp: datetime


class ValidationAllResponse(BaseModel):
    results: Dict[str, bool]
    pass_count: int
    total_count: int
    overall_pass: bool
    detailed_results: List[ValidationMethodResponse]


# ============================================================================
# REAL DATA SCHEMAS
# ============================================================================

class StrainListResponse(BaseModel):
    strains: List[str]
    count: int


class GeneListResponse(BaseModel):
    genes: List[str]
    count: int
    details: Dict[str, Any]


class RealCrossRequest(BaseModel):
    strain1: str
    strain2: str
    gene: str


class RealCrossResponse(BaseModel):
    strain1: str
    strain2: str
    gene: str
    genotypes: Dict[str, Any]
    phenotypes: Dict[str, Any]
    dataset_info: Dict[str, Any]


# ============================================================================
# WEBSOCKET SCHEMAS
# ============================================================================

class WebSocketMessage(BaseModel):
    type: str  # "breeding", "selection", "generation_advance"
    data: Dict[str, Any]


class WebSocketResponse(BaseModel):
    type: str
    status: str  # "success", "error", "progress"
    data: Dict[str, Any]
    message: Optional[str] = None


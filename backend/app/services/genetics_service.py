"""
Genetics service - wraps existing mouse-breeder.py functionality for API use.
"""
import sys
import os
from typing import List, Dict, Any, Tuple, Optional
import json

# Add parent directory to path to import mouse-breeder module
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
sys.path.insert(0, root_dir)

# Import from existing mouse-breeder.py using importlib
import importlib.util
mouse_breeder_path = os.path.join(root_dir, "mouse-breeder.py")
spec = importlib.util.spec_from_file_location("mouse_breeder", mouse_breeder_path)
mouse_breeder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mouse_breeder)

import uuid

# Import all needed components
Mouse = mouse_breeder.Mouse
Genome = mouse_breeder.Genome
Population = mouse_breeder.Population
GoalPresets = mouse_breeder.GoalPresets
Mode = mouse_breeder.Mode
Dataset = mouse_breeder.Dataset
mate = mouse_breeder.mate
load_gene_models = mouse_breeder.load_gene_models
get_gene_model = mouse_breeder.get_gene_model
detect_variable_loci = mouse_breeder.detect_variable_loci
validate_mendelian_ratios = mouse_breeder.validate_mendelian_ratios
validate_grm_relationships = mouse_breeder.validate_grm_relationships
validate_inbreeding_correlation = mouse_breeder.validate_inbreeding_correlation
validate_heritability = mouse_breeder.validate_heritability
validate_real_mode_predictions = mouse_breeder.validate_real_mode_predictions
SNPS_PER_CHROMOSOME = mouse_breeder.SNPS_PER_CHROMOSOME
NUM_SNPS = mouse_breeder.NUM_SNPS


class GeneticsService:
    """Service layer for genetics operations."""
    
    def __init__(self):
        self.populations: Dict[str, Population] = {}
        self.mice: Dict[str, Mouse] = {}
        self.gene_models = load_gene_models()
    
    def create_population(self, size: int, goal_preset: str, name: Optional[str] = None) -> Tuple[str, Population]:
        """Create a new population."""
        goal = getattr(GoalPresets, goal_preset, GoalPresets.LARGE_FRIENDLY)
        pop = Population(size=size, goal=goal)
        # Generate a collision-resistant population id
        pop_id = f"pop_{uuid.uuid4().hex[:8]}"
        self.populations[pop_id] = pop
        
        # Store individual mice
        for mouse in pop.mice:
            self.mice[str(mouse.id)] = mouse
        
        return pop_id, pop
    
    def get_population(self, pop_id: str) -> Optional[Population]:
        """Get population by ID."""
        return self.populations.get(pop_id)
    
    def get_mouse(self, mouse_id: str) -> Optional[Mouse]:
        """Get mouse by ID."""
        return self.mice.get(mouse_id)

    def sync_population_mice(self, pop_id: str) -> None:
        """Sync mouse registry with current population mice."""
        pop = self.get_population(pop_id)
        if not pop:
            return

        # Get all current mouse IDs in this population
        current_mouse_ids = {str(mouse.id) for mouse in pop.mice}

        # Remove mice from registry that are no longer in the population
        # (but keep mice from other populations)
        mice_to_remove = []
        for mouse_id, mouse in self.mice.items():
            # Check if this mouse belongs to this population
            # We can't directly check, so we'll just update all mice in the population
            pass

        # Add/update all current mice in the population
        for mouse in pop.mice:
            self.mice[str(mouse.id)] = mouse
    
    def breed_mice(self, parent1_id: str, parent2_id: str, n_offspring: int = 1) -> List[Mouse]:
        """Breed two mice and return offspring."""
        parent1 = self.get_mouse(parent1_id)
        parent2 = self.get_mouse(parent2_id)

        if not parent1 or not parent2:
            raise ValueError("Parent mouse not found")

        # Call mate() with the requested number of offspring
        offspring = mate(parent1, parent2, n_offspring=n_offspring)

        # Store offspring
        for mouse in offspring:
            self.mice[str(mouse.id)] = mouse

        return offspring
    
    def compute_grm(self, mouse_ids: List[str]) -> List[List[float]]:
        """Compute GRM for given mice."""
        mice = [self.get_mouse(mid) for mid in mouse_ids]
        if None in mice:
            raise ValueError("One or more mice not found")
        
        # Create temporary population
        pop = Population(size=0, goal=GoalPresets.LARGE_FRIENDLY)
        pop.mice = mice
        
        return pop.compute_grm()
    
    def calculate_inbreeding(self, mouse_ids: List[str]) -> Dict[str, Any]:
        """Calculate inbreeding coefficients."""
        mice = [self.get_mouse(mid) for mid in mouse_ids]
        if None in mice:
            raise ValueError("One or more mice not found")
        
        # Create temporary population
        pop = Population(size=0, goal=GoalPresets.LARGE_FRIENDLY)
        pop.mice = mice
        # Build registry mapping integer IDs -> Mouse objects for pedigree functions
        registry = {m.id: m for m in mice}

        # Compute pedigree-based inbreeding using function from mouse_breeder
        f_pedigree_values = [mouse_breeder.pedigree_inbreeding(m, registry) for m in mice]
        
        # Compute GRM for genomic inbreeding
        grm = pop.compute_grm()
        f_genomic_values = [grm[i][i] - 1.0 for i in range(len(mice))]
        
        return {
            "f_pedigree": f_pedigree_values,
            "f_genomic": f_genomic_values,
            "mean_f_pedigree": sum(f_pedigree_values) / len(f_pedigree_values) if f_pedigree_values else 0,
            "mean_f_genomic": sum(f_genomic_values) / len(f_genomic_values) if f_genomic_values else 0
        }
    
    def mouse_to_dict(self, mouse: Mouse) -> Dict[str, Any]:
        """Convert Mouse object to dictionary."""
        return {
            "id": str(mouse.id),
            "generation": mouse.generation,
            "sex": mouse.phenotype.get("size", "unknown"),  # Using size as proxy for sex
            "phenotype": mouse.polytrait if mouse.polytrait else 0.0,
            "genome_summary": {
                "coat_color": mouse.phenotype.get("coat_color"),
                "size": mouse.phenotype.get("size"),
                "ear_shape": mouse.phenotype.get("ear_shape"),
                "temperament": mouse.phenotype.get("temperament")
            },
            "pedigree": {
                "parents": mouse.parents if mouse.parents else None,
                "generation": mouse.generation
            }
        }


# Global service instance
genetics_service = GeneticsService()


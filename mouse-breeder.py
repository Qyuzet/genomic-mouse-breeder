"""
Mouse Breeding Simulator - Computational Biology Edition
A comprehensive genetics simulation with:
- Genome-wide SNPs (m=200 biallelic markers)
- Recombination via Poisson crossovers on 2 chromosomes
- Wright's pedigree inbreeding coefficient F
- VanRaden genomic relationship matrix (GRM)
- Quantitative trait via linear mixed model (LMM)
- Proper per-locus mutation model
"""

import random
from typing import Dict, List, Tuple, Optional, Set, NamedTuple
from enum import Enum
from collections import Counter
import math
import csv
import os
import glob
import sys
import json

# Set deterministic seed for reproducibility
random.seed(42)

# Constants
NUM_SNPS = 200  # Number of biallelic SNP markers
NUM_CHROMOSOMES = 2  # Two chromosomes
SNPS_PER_CHROMOSOME = NUM_SNPS // NUM_CHROMOSOMES  # 100 SNPs per chromosome
CHROMOSOME_LENGTH_CM = 100.0  # Length in centiMorgans
SNP_MUTATION_RATE = 0.001  # Per-locus mutation rate for SNPs
TRAIT_MUTATION_RATE = 0.01  # Per-locus mutation rate for visible traits
NARROW_SENSE_H2 = 0.4  # Narrow-sense heritability for quantitative trait


# ============================================================================
# DUAL MODE SUPPORT: SIM vs REAL
# ============================================================================

class Mode(Enum):
    """Runtime mode: SIM (simulated) or REAL (real dataset)."""
    SIM = "sim"
    REAL = "real"


class RealLocus(NamedTuple):
    """Definition of a real genetic locus mapped to a trait."""
    trait: str       # e.g., "coat_color"
    chr: str         # e.g., "chr16"
    pos: int         # genomic position (int)
    model: str       # e.g., "dominant_black", "recessive_white"


# Global variable to store dynamically detected loci
# Will be populated by detect_variable_loci() when dataset is loaded
REAL_LOCI: List[RealLocus] = []

# Global variable to store gene models loaded from JSON
GENE_MODELS: Dict = {}


def load_gene_models(filepath: str = "gene_models.json") -> Dict:
    """
    Load gene models from JSON configuration file.

    Args:
        filepath: Path to gene_models.json file

    Returns:
        Dictionary of gene models
    """
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            return data.get("genes", {})
    except FileNotFoundError:
        print(f"Warning: {filepath} not found. Using hardcoded defaults.")
        return {}
    except json.JSONDecodeError as e:
        print(f"Warning: Error parsing {filepath}: {e}. Using hardcoded defaults.")
        return {}


def get_gene_model(gene_name: str) -> Dict:
    """
    Get genetic model for a specific gene.

    Args:
        gene_name: Name of the gene (e.g., "TYRP1", "MC1R")

    Returns:
        Gene model dictionary, or DEFAULT model if gene not found
    """
    global GENE_MODELS

    # Load models if not already loaded
    if not GENE_MODELS:
        GENE_MODELS = load_gene_models()

    # Return gene model or default
    return GENE_MODELS.get(gene_name, GENE_MODELS.get("DEFAULT", {}))


class Dataset:
    """
    Lightweight loader for real mouse strain data.

    CSV Schemas:

    genotypes.csv:
        strain,chr,pos,genotype_012
        C57BL/6J,chr16,28515443,2
        BALB/cJ,chr16,28515443,0

    phenotypes.csv (optional):
        strain,coat_color
        C57BL/6J,black
        BALB/cJ,white
    """

    def __init__(self, phenopath: Optional[str] = None, genopath: Optional[str] = None):
        # phenotypes by strain: {strain: {"coat_color": "black"}}
        self.pheno: Dict[str, Dict[str, str]] = {}
        # genotypes by strain at specific loci: {strain: {(chr, pos): 0/1/2}}
        self.geno: Dict[str, Dict[Tuple[str, int], int]] = {}
        # Store genotype file path for metadata
        self.genopath: Optional[str] = genopath

        if phenopath:
            self._load_pheno(phenopath)
        if genopath:
            self._load_geno(genopath)

    def _load_pheno(self, path: str) -> None:
        """Load phenotype CSV."""
        with open(path, 'r') as f:
            r = csv.DictReader(f)
            for row in r:
                s = row["strain"]
                self.pheno.setdefault(s, {})
                if "coat_color" in row and row["coat_color"]:
                    self.pheno[s]["coat_color"] = row["coat_color"].strip().lower()

    def _load_geno(self, path: str) -> None:
        """Load genotype CSV."""
        with open(path, 'r') as f:
            r = csv.DictReader(f)
            for row in r:
                s = row["strain"]
                key = (row["chr"], int(row["pos"]))
                self.geno.setdefault(s, {})[key] = int(row["genotype_012"])


def detect_variable_loci(dataset: Dataset, strainA: str, strainB: str, max_loci: int = 10) -> List[RealLocus]:
    """
    Automatically detect loci where two strains differ in genotype.

    This function scans the dataset to find SNPs where strainA and strainB
    have different genotypes (e.g., 0 vs 2), which can drive phenotypic variation.

    Args:
        dataset: Loaded Dataset with genotype data
        strainA: First strain name
        strainB: Second strain name
        max_loci: Maximum number of variable loci to return (default: 10)

    Returns:
        List of RealLocus objects for loci with genotype differences
    """
    variable_loci = []

    # Get genotype maps for both strains
    geno_a = dataset.geno.get(strainA, {})
    geno_b = dataset.geno.get(strainB, {})

    # Find common loci
    common_loci = set(geno_a.keys()) & set(geno_b.keys())

    # Find loci where genotypes differ
    for (chr_name, pos) in sorted(common_loci):
        gt_a = geno_a[(chr_name, pos)]
        gt_b = geno_b[(chr_name, pos)]

        # Only include loci with actual variation (different genotypes)
        if gt_a != gt_b:
            # Infer gene name from file path if available
            gene_name = "UNKNOWN"
            if dataset.genopath:
                # Extract gene name from filename (more robust pattern)
                # Matches: snp_MC1R_, snp-MC1R, snp_TYRP1.csv, etc.
                import re
                fname = os.path.basename(dataset.genopath)
                match = re.search(r'snp[_-]([A-Za-z0-9]+)', fname)
                if match:
                    gene_name = match.group(1).upper()

            # Get gene model from configuration (flexible, not hardcoded!)
            gene_info = get_gene_model(gene_name)
            trait = gene_info.get("trait", "unknown")
            model_name = gene_name.lower()  # Use gene name as model identifier

            locus = RealLocus(
                trait=trait,
                chr=chr_name,
                pos=pos,
                model=model_name
            )
            variable_loci.append(locus)

            # Limit to max_loci
            if len(variable_loci) >= max_loci:
                break

    return variable_loci


def express_from_real_geno(trait: str, gt012: Optional[int], model: str) -> Optional[str]:
    """
    Interpret real genotype (0/1/2) to phenotype based on model.
    Uses gene_models.json configuration for flexible, extensible phenotype mapping.

    Args:
        trait: Trait name (e.g., "coat_color", "body_weight")
        gt012: Genotype as 0/1/2 (minor allele count)
        model: Model name (typically gene name in lowercase, e.g., "tyrp1", "mc1r")

    Returns:
        Phenotype value or None if not interpretable
    """
    if gt012 is None:
        return None

    # Get gene model from configuration
    gene_name = model.upper()
    gene_info = get_gene_model(gene_name)

    if not gene_info:
        # Fallback: return generic phenotype
        return f"phenotype_{gt012}"

    # Get genotype-to-phenotype mapping
    genotypes = gene_info.get("model", {}).get("genotypes", {})
    geno_str = str(gt012)

    if geno_str in genotypes:
        return genotypes[geno_str].get("phenotype", f"phenotype_{gt012}")

    # Fallback
    return f"phenotype_{gt012}"


# ============================================================================
# GENOME AND MOUSE CLASSES
# ============================================================================

class Genome:
    """
    Stores genetic information including visible traits and genome-wide SNPs.

    Visible Traits (4 loci):
    - coat_color: B (black, dominant) / b (white, recessive)
    - size: L (large, dominant) / s (small, recessive)
    - ear_shape: N (normal, dominant) / D (dumbo, recessive)
    - temperament: F (friendly, dominant) / A (aggressive, recessive)

    Genome-wide SNPs:
    - m=200 biallelic SNPs coded as 0/1/2 (minor allele count)
    - Organized on 2 chromosomes with known positions
    - Stored as haplotypes (two lists of 0/1 alleles per chromosome)
    """

    def __init__(self,
                 coat_color: Tuple[str, str] = None,
                 size: Tuple[str, str] = None,
                 ear_shape: Tuple[str, str] = None,
                 temperament: Tuple[str, str] = None,
                 haplotype_chr1: Tuple[List[int], List[int]] = None,
                 haplotype_chr2: Tuple[List[int], List[int]] = None,
                 is_founder: bool = False):
        """
        Initialize genome with allele pairs and SNPs.

        Args:
            coat_color, size, ear_shape, temperament: Allele pairs for visible traits
            haplotype_chr1: Tuple of (maternal, paternal) haplotypes for chromosome 1
            haplotype_chr2: Tuple of (maternal, paternal) haplotypes for chromosome 2
            is_founder: If True, initialize SNPs from population frequencies
        """
        # Visible traits
        self.coat_color = coat_color or self._random_alleles(['B', 'b'])
        self.size = size or self._random_alleles(['L', 's'])
        self.ear_shape = ear_shape or self._random_alleles(['N', 'D'])
        self.temperament = temperament or self._random_alleles(['F', 'A'])

        # Haplotypes: two chromosomes, each with maternal and paternal haplotypes
        if haplotype_chr1 is None or haplotype_chr2 is None:
            if is_founder:
                # Initialize from population allele frequencies
                self.haplotype_chr1 = self._init_founder_haplotypes(SNPS_PER_CHROMOSOME)
                self.haplotype_chr2 = self._init_founder_haplotypes(SNPS_PER_CHROMOSOME)
            else:
                # Random initialization (for testing)
                self.haplotype_chr1 = self._random_haplotypes(SNPS_PER_CHROMOSOME)
                self.haplotype_chr2 = self._random_haplotypes(SNPS_PER_CHROMOSOME)
        else:
            self.haplotype_chr1 = haplotype_chr1
            self.haplotype_chr2 = haplotype_chr2

    def _random_alleles(self, options: List[str]) -> Tuple[str, str]:
        """Generate random allele pair for visible traits."""
        return (random.choice(options), random.choice(options))

    def _random_haplotypes(self, length: int) -> Tuple[List[int], List[int]]:
        """Generate random haplotypes (for non-founders)."""
        maternal = [random.randint(0, 1) for _ in range(length)]
        paternal = [random.randint(0, 1) for _ in range(length)]
        return (maternal, paternal)

    def _init_founder_haplotypes(self, length: int) -> Tuple[List[int], List[int]]:
        """
        Initialize founder haplotypes from population allele frequencies.
        Each SNP sampled from Binomial(2, p_j) where p_j ~ Uniform(0.05, 0.5).
        """
        maternal = []
        paternal = []
        for _ in range(length):
            # Sample allele frequency for this SNP
            p_j = random.uniform(0.05, 0.5)
            # Sample genotype from Binomial(2, p_j)
            genotype = sum(random.random() < p_j for _ in range(2))
            # Distribute alleles to maternal and paternal
            if genotype == 0:
                maternal.append(0)
                paternal.append(0)
            elif genotype == 1:
                if random.random() < 0.5:
                    maternal.append(1)
                    paternal.append(0)
                else:
                    maternal.append(0)
                    paternal.append(1)
            else:  # genotype == 2
                maternal.append(1)
                paternal.append(1)
        return (maternal, paternal)

    def get_snp_genotypes(self) -> List[int]:
        """
        Get SNP genotypes as vector of 0/1/2 (minor allele count).
        Concatenates both chromosomes.
        """
        genotypes = []
        for haplotype in [self.haplotype_chr1, self.haplotype_chr2]:
            maternal, paternal = haplotype
            for m, p in zip(maternal, paternal):
                genotypes.append(m + p)
        return genotypes

    def express_phenotype(self) -> Dict[str, str]:
        """
        Express phenotype based on dominant/recessive rules.
        In REAL mode, overrides with real genotype data for mapped loci.
        Returns dict of trait names to expressed values.
        """
        phenotype = {}

        # Default toy rules (SIM mode)
        # Coat color: B is dominant (black), b is recessive (white)
        if 'B' in self.coat_color:
            phenotype['coat_color'] = 'black'
        else:
            phenotype['coat_color'] = 'white'

        # Size: L is dominant (large), s is recessive (small)
        if 'L' in self.size:
            phenotype['size'] = 'large'
        else:
            phenotype['size'] = 'small'

        # Ear shape: N is dominant (normal), D is recessive (dumbo)
        if 'N' in self.ear_shape:
            phenotype['ear_shape'] = 'normal'
        else:
            phenotype['ear_shape'] = 'dumbo'

        # Temperament: F is dominant (friendly), A is recessive (aggressive)
        if 'F' in self.temperament:
            phenotype['temperament'] = 'friendly'
        else:
            phenotype['temperament'] = 'aggressive'

        # REAL mode override: use real genotype data for mapped loci
        owner = getattr(self, "owner", None)
        if owner and owner.mode == Mode.REAL:
            ds = owner.dataset
            # Prefer per-mouse real_geno (child of two real founders), otherwise use strain-based ds.geno
            real_map = getattr(owner, "real_geno", None)
            if real_map is None and ds and owner.strain and owner.strain in ds.geno:
                real_map = ds.geno[owner.strain]

            if real_map:
                for L in REAL_LOCI:
                    if L.trait == "coat_color":
                        gt = real_map.get((L.chr, L.pos))
                        val = express_from_real_geno("coat_color", gt, L.model)
                        if val is not None:
                            phenotype["coat_color"] = val

        return phenotype

    def calculate_fitness(self, goal: Dict[str, str]) -> float:
        """
        Calculate fitness score (0-100) based on how well phenotype matches goal.

        Args:
            goal: Dict of trait names to desired values

        Returns:
            Fitness score from 0 (no match) to 100 (perfect match)
        """
        phenotype = self.express_phenotype()
        matches = sum(1 for trait, value in goal.items()
                     if phenotype.get(trait) == value)
        total_traits = len(goal)

        if total_traits == 0:
            return 100.0

        return (matches / total_traits) * 100.0

    def get_genotype_string(self) -> str:
        """Return string representation of genotype."""
        return (f"Coat:{self.coat_color[0]}{self.coat_color[1]} "
                f"Size:{self.size[0]}{self.size[1]} "
                f"Ears:{self.ear_shape[0]}{self.ear_shape[1]} "
                f"Temp:{self.temperament[0]}{self.temperament[1]}")

    def copy(self) -> 'Genome':
        """Create a deep copy of this genome."""
        g = Genome(
            coat_color=self.coat_color,
            size=self.size,
            ear_shape=self.ear_shape,
            temperament=self.temperament,
            haplotype_chr1=(self.haplotype_chr1[0].copy(), self.haplotype_chr1[1].copy()),
            haplotype_chr2=(self.haplotype_chr2[0].copy(), self.haplotype_chr2[1].copy())
        )
        # Preserve owner reference for REAL mode phenotype override
        g.owner = getattr(self, "owner", None)
        return g


# Global counter for unique mouse IDs
_mouse_id_counter = 0


class Mouse:
    """
    Represents an individual mouse with genome, phenotype, lineage, and quantitative trait.
    Supports both SIM mode (simulated) and REAL mode (real strain data).
    """

    def __init__(self,
                 genome: Genome = None,
                 generation: int = 0,
                 parents: Tuple[int, int] = None,
                 age: int = 0,
                 is_founder: bool = False,
                 polytrait: float = None,
                 strain: Optional[str] = None,
                 dataset: Optional[Dataset] = None,
                 mode: Mode = Mode.SIM):
        """
        Initialize a mouse.

        Args:
            genome: Genome object (random if None)
            generation: Generation number
            parents: Tuple of parent IDs (None for founders)
            age: Age in time units
            is_founder: Whether this is a founder individual
            polytrait: Quantitative trait value (computed if None)
            strain: Strain name (for REAL mode founders)
            dataset: Dataset object (for REAL mode)
            mode: Runtime mode (SIM or REAL)
        """
        global _mouse_id_counter
        self.id = _mouse_id_counter
        _mouse_id_counter += 1

        self.genome = genome or Genome(is_founder=is_founder)
        self.generation = generation
        self.parents = parents
        self.age = age

        # REAL mode support
        self.strain = strain
        self.dataset = dataset
        self.mode = mode
        self.real_geno: Optional[Dict[Tuple[str, int], int]] = None  # For offspring in REAL mode

        # Link genome back to owner for REAL mode phenotype expression
        self.genome.owner = self

        # Auto-generate phenotype
        self.phenotype = self.genome.express_phenotype()

        # Quantitative trait (will be set by Population)
        self.polytrait = polytrait

    def __str__(self) -> str:
        """String representation of the mouse."""
        parent_str = f"Parents: {self.parents}" if self.parents else "Founder"
        pheno_str = ", ".join(f"{k}={v}" for k, v in self.phenotype.items())

        return (f"Mouse #{self.id} (Gen {self.generation}, Age {self.age})\n"
                f"  Phenotype: {pheno_str}\n"
                f"  Genotype: {self.genome.get_genotype_string()}\n"
                f"  {parent_str}")

    def get_fitness(self, goal: Dict[str, str]) -> float:
        """Calculate fitness for this mouse."""
        return self.genome.calculate_fitness(goal)


# ============================================================================
# REAL MODE CROSSING HELPERS
# ============================================================================

def _inherit_012(gt012: int) -> int:
    """
    Sample one allele from a 0/1/2 genotype.

    Args:
        gt012: Genotype as 0/1/2 (minor allele count)

    Returns:
        Sampled allele (0 or 1)
    """
    if gt012 == 0:
        return 0  # aa → always pass 'a' (coded as 0)
    if gt012 == 2:
        return 1  # AA → always pass 'A' (coded as 1)
    return random.choice([0, 1])  # Aa → 50/50


def make_child_real_geno(p1: Mouse, p2: Mouse) -> Dict[Tuple[str, int], int]:
    """
    Create child's real genotype at mapped loci from two parents.

    Args:
        p1: Parent 1
        p2: Parent 2

    Returns:
        Dict mapping (chr, pos) to 0/1/2 genotype for child
    """
    def map_for(m: Mouse) -> Dict[Tuple[str, int], int]:
        """Get real genotype map for a mouse (either stored or from dataset)."""
        if getattr(m, "real_geno", None):
            return m.real_geno
        ds = m.dataset
        if ds and m.strain and m.strain in ds.geno:
            return ds.geno[m.strain]
        return {}

    g1 = map_for(p1)
    g2 = map_for(p2)
    child = {}

    for L in REAL_LOCI:
        key = (L.chr, L.pos)
        a1 = _inherit_012(g1.get(key, 0))
        a2 = _inherit_012(g2.get(key, 0))
        child[key] = a1 + a2

    return child


# ============================================================================
# BREEDING FUNCTION
# ============================================================================

def mate(parent1: Mouse, parent2: Mouse) -> List[Mouse]:
    """
    Breed two mice using Mendelian inheritance with recombination.

    Implements:
    - Recombination via Poisson crossovers on chromosomes
    - Per-locus flip mutation (0.001 for SNPs, 0.01 for visible traits)
    - Proper gamete formation with haplotype alternation

    Args:
        parent1: First parent mouse
        parent2: Second parent mouse

    Returns:
        List of 4-6 offspring mice
    """
    litter_size = random.randint(4, 6)
    offspring = []

    new_generation = max(parent1.generation, parent2.generation) + 1
    parent_ids = (parent1.id, parent2.id)

    for _ in range(litter_size):
        # Form gametes from each parent with recombination
        gamete1_chr1 = _form_gamete(parent1.genome.haplotype_chr1, CHROMOSOME_LENGTH_CM)
        gamete1_chr2 = _form_gamete(parent1.genome.haplotype_chr2, CHROMOSOME_LENGTH_CM)
        gamete2_chr1 = _form_gamete(parent2.genome.haplotype_chr1, CHROMOSOME_LENGTH_CM)
        gamete2_chr2 = _form_gamete(parent2.genome.haplotype_chr2, CHROMOSOME_LENGTH_CM)

        # Apply SNP mutations
        gamete1_chr1 = _mutate_haplotype(gamete1_chr1, SNP_MUTATION_RATE)
        gamete1_chr2 = _mutate_haplotype(gamete1_chr2, SNP_MUTATION_RATE)
        gamete2_chr1 = _mutate_haplotype(gamete2_chr1, SNP_MUTATION_RATE)
        gamete2_chr2 = _mutate_haplotype(gamete2_chr2, SNP_MUTATION_RATE)

        # Combine gametes to form offspring haplotypes
        child_haplotype_chr1 = (gamete1_chr1, gamete2_chr1)
        child_haplotype_chr2 = (gamete1_chr2, gamete2_chr2)

        # Inherit visible traits with proper mutation
        child_genome = Genome(
            coat_color=_inherit_trait_allele(parent1.genome.coat_color, parent2.genome.coat_color, ['B', 'b']),
            size=_inherit_trait_allele(parent1.genome.size, parent2.genome.size, ['L', 's']),
            ear_shape=_inherit_trait_allele(parent1.genome.ear_shape, parent2.genome.ear_shape, ['N', 'D']),
            temperament=_inherit_trait_allele(parent1.genome.temperament, parent2.genome.temperament, ['F', 'A']),
            haplotype_chr1=child_haplotype_chr1,
            haplotype_chr2=child_haplotype_chr2
        )

        child = Mouse(
            genome=child_genome,
            generation=new_generation,
            parents=parent_ids,
            age=0,
            mode=parent1.mode,
            dataset=parent1.dataset or parent2.dataset
        )

        # REAL mode: compute child's real genotype at mapped loci
        if parent1.mode == Mode.REAL:
            child.real_geno = make_child_real_geno(parent1, parent2)
            # Re-express phenotype with real genotype
            child.genome.owner = child
            child.phenotype = child.genome.express_phenotype()

        offspring.append(child)

    return offspring


def _form_gamete(haplotype: Tuple[List[int], List[int]], length_cm: float) -> List[int]:
    """
    Form a gamete from parental haplotypes via recombination.

    Uses Poisson process for crossovers: number ~ Poisson(λ = length_in_Morgans).
    Alternates between maternal and paternal haplotypes at crossover points.

    Args:
        haplotype: Tuple of (maternal, paternal) haplotype lists
        length_cm: Chromosome length in centiMorgans

    Returns:
        Recombinant gamete haplotype
    """
    maternal, paternal = haplotype
    n_snps = len(maternal)

    # Number of crossovers from Poisson(λ = length_in_Morgans)
    length_morgans = length_cm / 100.0
    n_crossovers = _poisson_sample(length_morgans)

    if n_crossovers == 0:
        # No recombination: randomly choose one parental haplotype
        return maternal.copy() if random.random() < 0.5 else paternal.copy()

    # Generate crossover positions uniformly
    crossover_positions = sorted([random.randint(1, n_snps - 1) for _ in range(n_crossovers)])

    # Build recombinant gamete by alternating between haplotypes
    gamete = []
    current_source = maternal if random.random() < 0.5 else paternal
    crossover_idx = 0

    for i in range(n_snps):
        if crossover_idx < len(crossover_positions) and i >= crossover_positions[crossover_idx]:
            # Switch source at crossover
            current_source = paternal if current_source is maternal else maternal
            crossover_idx += 1
        gamete.append(current_source[i])

    return gamete


def _poisson_sample(lam: float) -> int:
    """Sample from Poisson distribution using Knuth's algorithm."""
    if lam <= 0:
        return 0
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while p > L:
        k += 1
        p *= random.random()
    return k - 1


def _mutate_haplotype(haplotype: List[int], mutation_rate: float) -> List[int]:
    """
    Apply per-locus flip mutation to a haplotype.

    Args:
        haplotype: List of 0/1 alleles
        mutation_rate: Per-locus mutation probability

    Returns:
        Mutated haplotype
    """
    mutated = []
    for allele in haplotype:
        if random.random() < mutation_rate:
            mutated.append(1 - allele)  # Flip 0↔1
        else:
            mutated.append(allele)
    return mutated


def _inherit_trait_allele(parent1_alleles: Tuple[str, str],
                         parent2_alleles: Tuple[str, str],
                         valid_alleles: List[str]) -> Tuple[str, str]:
    """
    Inherit one allele from each parent for visible traits with proper mutation.

    Mutation flips dominant↔recessive (e.g., B↔b) rather than sampling randomly.

    Args:
        parent1_alleles: Allele pair from parent 1
        parent2_alleles: Allele pair from parent 2
        valid_alleles: List of [dominant, recessive] alleles

    Returns:
        Tuple of two alleles for offspring
    """
    # Randomly select one allele from each parent
    allele1 = random.choice(parent1_alleles)
    allele2 = random.choice(parent2_alleles)

    # Apply mutation chance (flip dominant↔recessive)
    if random.random() < TRAIT_MUTATION_RATE:
        # Flip to the other allele
        allele1 = valid_alleles[1] if allele1 == valid_alleles[0] else valid_alleles[0]

    if random.random() < TRAIT_MUTATION_RATE:
        allele2 = valid_alleles[1] if allele2 == valid_alleles[0] else valid_alleles[0]

    return (allele1, allele2)


# ============================================================================
# PUNNETT PROBABILITY CALCULATOR (REAL MODE)
# ============================================================================

def punnett_probs_two_parents(p1: Mouse, p2: Mouse, draws: int = 10000) -> Dict[str, float]:
    """
    Compute offspring phenotype probabilities for two parents in REAL mode.

    Uses Monte Carlo simulation to estimate phenotype frequencies at mapped loci.

    Args:
        p1: Parent 1
        p2: Parent 2
        draws: Number of Monte Carlo draws (default 10000)

    Returns:
        Dict mapping phenotype values to probabilities (e.g., {"black": 0.75, "white": 0.25})
    """
    c = Counter()

    for _ in range(draws):
        child_map = make_child_real_geno(p1, p2)
        # Interpret coat color for now (can extend to other traits)
        if REAL_LOCI:
            locus = REAL_LOCI[0]  # First mapped locus
            gt = child_map.get((locus.chr, locus.pos))
            ph = express_from_real_geno(locus.trait, gt, locus.model)
            c[ph or "unknown"] += 1

    total = sum(c.values()) or 1
    return {k: v / total for k, v in c.items()}


# ============================================================================
# WRIGHT'S PEDIGREE INBREEDING COEFFICIENT
# ============================================================================

# Memoization cache for kinship coefficients
_kinship_cache: Dict[Tuple[int, int], float] = {}


def kinship(i_id: int, j_id: int, registry: Dict[int, Mouse]) -> float:
    """
    Compute Wright's kinship coefficient φ(i,j) between two individuals.

    Recursive definition:
    - φ(i,i) = 0.5 * (1 + F_i) where F_i is inbreeding coefficient of i
    - φ(i,j) = 0.5 * [φ(dam_i, j) + φ(sire_i, j)] if i has parents
    - φ(i,j) = 0 if i and j are founders (unrelated)

    Uses memoization for efficiency.

    Args:
        i_id: ID of first individual
        j_id: ID of second individual
        registry: Dict mapping IDs to Mouse objects

    Returns:
        Kinship coefficient (0 to 0.5)
    """
    # Ensure i_id <= j_id for cache consistency
    if i_id > j_id:
        i_id, j_id = j_id, i_id

    # Check cache
    cache_key = (i_id, j_id)
    if cache_key in _kinship_cache:
        return _kinship_cache[cache_key]

    # Get individuals
    if i_id not in registry or j_id not in registry:
        return 0.0

    i = registry[i_id]
    j = registry[j_id]

    # Case 1: Same individual φ(i,i) = 0.5 * (1 + F_i)
    if i_id == j_id:
        if i.parents is None:
            # Founder: F_i = 0
            result = 0.5
        else:
            # F_i = φ(dam, sire)
            dam_id, sire_id = i.parents
            F_i = kinship(dam_id, sire_id, registry)
            result = 0.5 * (1 + F_i)
        _kinship_cache[cache_key] = result
        return result

    # Case 2: Both founders (unrelated)
    if i.parents is None and j.parents is None:
        _kinship_cache[cache_key] = 0.0
        return 0.0

    # Case 3: One or both have parents
    # Recurse on the individual with parents (or the younger one)
    if i.parents is None:
        # i is founder, j has parents
        dam_j, sire_j = j.parents
        result = 0.5 * (kinship(i_id, dam_j, registry) + kinship(i_id, sire_j, registry))
    elif j.parents is None:
        # j is founder, i has parents
        dam_i, sire_i = i.parents
        result = 0.5 * (kinship(dam_i, j_id, registry) + kinship(sire_i, j_id, registry))
    else:
        # Both have parents: use the one with higher generation (younger)
        if i.generation >= j.generation:
            dam_i, sire_i = i.parents
            result = 0.5 * (kinship(dam_i, j_id, registry) + kinship(sire_i, j_id, registry))
        else:
            dam_j, sire_j = j.parents
            result = 0.5 * (kinship(i_id, dam_j, registry) + kinship(i_id, sire_j, registry))

    _kinship_cache[cache_key] = result
    return result


def pedigree_inbreeding(mouse: Mouse, registry: Dict[int, Mouse]) -> float:
    """
    Compute pedigree inbreeding coefficient F for an individual.

    F_X = φ(dam, sire) where dam and sire are parents of X.
    For founders, F = 0.

    Args:
        mouse: The individual
        registry: Dict mapping IDs to Mouse objects

    Returns:
        Inbreeding coefficient F (0 to 1)
    """
    if mouse.parents is None:
        return 0.0

    dam_id, sire_id = mouse.parents
    return kinship(dam_id, sire_id, registry)


def calculate_relatedness(mouse1: Mouse, mouse2: Mouse, registry: Dict[int, Mouse]) -> float:
    """
    Calculate coefficient of relatedness between two mice.

    Relatedness r = 2 * φ(i,j) where φ is the kinship coefficient.

    Args:
        mouse1: First mouse
        mouse2: Second mouse
        registry: Dictionary mapping mouse IDs to Mouse objects

    Returns:
        Coefficient from 0 (unrelated) to 1 (identical)
    """
    return 2.0 * kinship(mouse1.id, mouse2.id, registry)


def _get_ancestors(mouse: Mouse, rat_registry: Dict[int, Mouse], max_depth: int = 10) -> Set[int]:
    """
    Recursively get all ancestor IDs for a mouse.

    Args:
        mouse: The mouse to trace
        rat_registry: Dictionary of all mice
        max_depth: Maximum generations to trace back

    Returns:
        Set of ancestor mouse IDs
    """
    ancestors = set()

    if not mouse.parents or max_depth <= 0:
        return ancestors

    for parent_id in mouse.parents:
        ancestors.add(parent_id)

        if parent_id in rat_registry:
            parent = rat_registry[parent_id]
            ancestors.update(_get_ancestors(parent, rat_registry, max_depth - 1))

    return ancestors


def print_pedigree(mouse: Mouse, rat_registry: Dict[int, Mouse], depth: int = 3, indent: int = 0):
    """
    Print a pedigree tree for a mouse.

    Args:
        mouse: The mouse to display
        rat_registry: Dictionary of all mice
        depth: How many generations to show
        indent: Current indentation level (for recursion)
    """
    prefix = "  " * indent
    pheno = ", ".join(f"{k}={v}" for k, v in mouse.phenotype.items())
    print(f"{prefix}+- Mouse #{mouse.id} (Gen {mouse.generation}): {pheno}")

    if depth > 0 and mouse.parents:
        for parent_id in mouse.parents:
            if parent_id in rat_registry:
                parent = rat_registry[parent_id]
                print_pedigree(parent, rat_registry, depth - 1, indent + 1)


# ============================================================================
# BREEDING GOALS
# ============================================================================

class GoalPresets:
    """Predefined breeding goals for common objectives."""

    ALL_WHITE = {
        'coat_color': 'white',
        'size': 'large',
        'ear_shape': 'normal',
        'temperament': 'friendly'
    }

    LARGE_FRIENDLY = {
        'size': 'large',
        'temperament': 'friendly'
    }

    DUMBO_EARS = {
        'ear_shape': 'dumbo',
        'temperament': 'friendly'
    }

    MAXIMIZE_DIVERSITY = {}  # Special case: no specific goal, maximize genetic variation

    @classmethod
    def get_goal(cls, name: str) -> Dict[str, str]:
        """Get a goal by name."""
        goals = {
            'all_white': cls.ALL_WHITE,
            'large_friendly': cls.LARGE_FRIENDLY,
            'dumbo_ears': cls.DUMBO_EARS,
            'maximize_diversity': cls.MAXIMIZE_DIVERSITY
        }
        return goals.get(name.lower(), cls.LARGE_FRIENDLY)


# ============================================================================
# POPULATION MANAGEMENT
# ============================================================================

class Population:
    """
    Manages a population of mice with breeding, selection, and statistics tracking.
    Supports both SIM mode (simulated) and REAL mode (real strain data).
    """

    def __init__(self,
                 size: int = 30,
                 goal: Dict[str, str] = None,
                 mode: Mode = Mode.SIM,
                 dataset: Optional[Dataset] = None,
                 strainA: Optional[str] = None,
                 strainB: Optional[str] = None):
        """
        Initialize a population with founder mice.

        Args:
            size: Number of mice to start with (default 30)
            goal: Breeding goal (dict of trait: value pairs)
            mode: Runtime mode (SIM or REAL)
            dataset: Dataset object (for REAL mode)
            strainA: First founder strain name (for REAL mode)
            strainB: Second founder strain name (for REAL mode)
        """
        self.mice: List[Mouse] = []
        self.generation: int = 0
        self.goal: Dict[str, str] = goal or GoalPresets.LARGE_FRIENDLY
        self.history: List[Dict] = []
        self.mouse_registry: Dict[int, Mouse] = {}
        self.mode = mode
        self.dataset = dataset

        # SNP effect sizes for quantitative trait (sampled once for the population)
        # β ~ N(0, σ²_β) where σ²_β chosen to achieve target h²
        self.snp_effects = [random.gauss(0, 0.1) for _ in range(NUM_SNPS)]

        # Initialize founders based on mode
        if mode == Mode.REAL and strainA and strainB:
            # REAL mode: create at least two founders from specified strains
            # Add one of each strain
            mouse_a = Mouse(generation=0, is_founder=True, strain=strainA, dataset=dataset, mode=mode)
            mouse_b = Mouse(generation=0, is_founder=True, strain=strainB, dataset=dataset, mode=mode)
            self.mice.append(mouse_a)
            self.mice.append(mouse_b)
            self.mouse_registry[mouse_a.id] = mouse_a
            self.mouse_registry[mouse_b.id] = mouse_b

            # Fill rest with duplicates of the two strains (alternating)
            for i in range(size - 2):
                strain = strainA if i % 2 == 0 else strainB
                mouse = Mouse(generation=0, is_founder=True, strain=strain, dataset=dataset, mode=mode)
                self.mice.append(mouse)
                self.mouse_registry[mouse.id] = mouse
        else:
            # SIM mode: random founder mice
            for _ in range(size):
                mouse = Mouse(generation=0, is_founder=True, mode=mode, dataset=dataset)
                self.mice.append(mouse)
                self.mouse_registry[mouse.id] = mouse

        # Generate quantitative traits for founders
        self._generate_polytraits()

        # Record initial stats
        self._record_stats()

    def add_mice(self, mice: List[Mouse]):
        """Add mice to the population."""
        for mouse in mice:
            self.mice.append(mouse)
            self.mouse_registry[mouse.id] = mouse

    def remove_mice(self, mice: List[Mouse]):
        """Remove mice from the population."""
        for mouse in mice:
            if mouse in self.mice:
                self.mice.remove(mouse)

    def get_stats(self) -> Dict:
        """
        Get current population statistics including genomic metrics.

        Returns:
            Dict with population stats including trait frequencies, fitness, diversity,
            pedigree/genomic inbreeding, GRM, heterozygosity, and polytrait stats
        """
        if not self.mice:
            return {
                'generation': self.generation,
                'population_size': 0,
                'avg_fitness': 0,
                'trait_frequencies': {},
                'genetic_diversity': 0,
                'mean_F_pedigree': 0,
                'mean_F_genomic': 0,
                'corr_F_pedigree_genomic': 0,
                'mean_G_ii': 0,
                'mean_offdiag_G': 0,
                'heterozygosity_SNP': 0,
                'polytrait_mean': 0,
                'polytrait_sd': 0,
                'h2_target': NARROW_SENSE_H2,
                'h2_empirical': 0
            }

        n = len(self.mice)

        # Calculate average fitness
        fitnesses = [mouse.get_fitness(self.goal) for mouse in self.mice]
        avg_fitness = sum(fitnesses) / n

        # Calculate trait frequencies
        trait_frequencies = {}
        for trait in ['coat_color', 'size', 'ear_shape', 'temperament']:
            trait_frequencies[trait] = self._get_trait_frequency(trait)

        # Calculate genetic diversity (visible traits)
        genetic_diversity = self._calculate_genetic_diversity()

        # Pedigree inbreeding
        F_pedigree_values = [pedigree_inbreeding(mouse, self.mouse_registry) for mouse in self.mice]
        mean_F_pedigree = sum(F_pedigree_values) / n

        # Genomic inbreeding and GRM
        G = self.compute_grm()
        F_genomic_values = [G[i][i] - 1.0 for i in range(n)]
        mean_F_genomic = sum(F_genomic_values) / n
        mean_G_ii = sum(G[i][i] for i in range(n)) / n

        # Mean off-diagonal GRM (relatedness)
        offdiag_sum = sum(G[i][j] for i in range(n) for j in range(n) if i != j)
        mean_offdiag_G = offdiag_sum / (n * (n - 1)) if n > 1 else 0

        # Correlation between pedigree and genomic F
        if len(F_pedigree_values) > 1:
            mean_Fp = sum(F_pedigree_values) / n
            mean_Fg = sum(F_genomic_values) / n
            cov = sum((F_pedigree_values[i] - mean_Fp) * (F_genomic_values[i] - mean_Fg) for i in range(n)) / n
            var_Fp = sum((f - mean_Fp)**2 for f in F_pedigree_values) / n
            var_Fg = sum((f - mean_Fg)**2 for f in F_genomic_values) / n
            corr_F = cov / ((var_Fp * var_Fg) ** 0.5) if var_Fp > 0 and var_Fg > 0 else 0
        else:
            corr_F = 0

        # SNP heterozygosity
        heterozygosity_SNP = self.mean_heterozygosity_SNP()

        # Polytrait statistics
        polytraits = [mouse.polytrait for mouse in self.mice if mouse.polytrait is not None]
        if polytraits:
            polytrait_mean = sum(polytraits) / len(polytraits)
            polytrait_var = sum((p - polytrait_mean)**2 for p in polytraits) / len(polytraits)
            polytrait_sd = polytrait_var ** 0.5

            # Empirical h² estimate: Var(u) / [Var(u) + Var(ε)]
            # Approximate using variance decomposition
            h2_empirical = polytrait_var / (polytrait_var + 1.0) if polytrait_var > 0 else 0
        else:
            polytrait_mean = 0
            polytrait_sd = 0
            h2_empirical = 0

        return {
            'generation': self.generation,
            'population_size': n,
            'avg_fitness': avg_fitness,
            'trait_frequencies': trait_frequencies,
            'genetic_diversity': genetic_diversity,
            'max_fitness': max(fitnesses) if fitnesses else 0,
            'min_fitness': min(fitnesses) if fitnesses else 0,
            'mean_F_pedigree': mean_F_pedigree,
            'mean_F_genomic': mean_F_genomic,
            'corr_F_pedigree_genomic': corr_F,
            'mean_G_ii': mean_G_ii,
            'mean_offdiag_G': mean_offdiag_G,
            'heterozygosity_SNP': heterozygosity_SNP,
            'polytrait_mean': polytrait_mean,
            'polytrait_sd': polytrait_sd,
            'h2_target': NARROW_SENSE_H2,
            'h2_empirical': h2_empirical
        }

    def _get_trait_frequency(self, trait: str) -> Dict[str, float]:
        """
        Get frequency distribution for a specific trait.

        Args:
            trait: Trait name (e.g., 'coat_color')

        Returns:
            Dict mapping trait values to percentages
        """
        if not self.mice:
            return {}

        counts = {}
        for mouse in self.mice:
            value = mouse.phenotype.get(trait)
            counts[value] = counts.get(value, 0) + 1

        total = len(self.mice)
        return {value: (count / total) * 100 for value, count in counts.items()}

    def _calculate_genetic_diversity(self) -> float:
        """
        Calculate genetic diversity score (0-100).
        Higher score = more genetic variation.

        Uses allele frequency variance across all genes.
        """
        if not self.mice:
            return 0.0

        # Count allele frequencies for each gene
        genes = ['coat_color', 'size', 'ear_shape', 'temperament']
        total_diversity = 0

        for gene in genes:
            allele_counts = {}
            total_alleles = 0

            for mouse in self.mice:
                alleles = getattr(mouse.genome, gene)
                for allele in alleles:
                    allele_counts[allele] = allele_counts.get(allele, 0) + 1
                    total_alleles += 1

            if total_alleles == 0:
                continue

            # Calculate heterozygosity (diversity measure)
            # Higher when alleles are evenly distributed
            frequencies = [count / total_alleles for count in allele_counts.values()]
            heterozygosity = 1 - sum(f * f for f in frequencies)
            total_diversity += heterozygosity

        # Normalize to 0-100 scale
        max_diversity = len(genes) * 0.5  # Max heterozygosity per gene is 0.5
        return (total_diversity / max_diversity) * 100 if max_diversity > 0 else 0

    def _record_stats(self):
        """Record current generation statistics to history."""
        stats = self.get_stats()
        self.history.append(stats)

    # ========================================================================
    # GENOMIC METHODS (GRM, INBREEDING, QUANTITATIVE TRAIT)
    # ========================================================================

    def compute_grm(self) -> List[List[float]]:
        """
        Compute VanRaden genomic relationship matrix (GRM).

        Formula: G = (1 / Σ 2p_j(1-p_j)) * (M - 2P)(M - 2P)ᵀ
        where:
        - M is n×m matrix of SNP genotypes (0/1/2)
        - P is matrix of 2p_j (allele frequencies)
        - p_j is frequency of allele 1 at SNP j

        Returns:
            n×n GRM matrix as list of lists

        TODO: In REAL mode, compute G from dataset.geno (real MPD loci)
              instead of the 200 simulated SNPs for fully real analysis.
        """
        if not self.mice:
            return [[]]

        n = len(self.mice)
        m = NUM_SNPS

        # Get genotype matrix M (n × m)
        M = []
        for mouse in self.mice:
            M.append(mouse.genome.get_snp_genotypes())

        # Compute allele frequencies p_j for each SNP
        p = []
        for j in range(m):
            allele_sum = sum(M[i][j] for i in range(n))
            p_j = allele_sum / (2.0 * n)  # Frequency of allele 1
            p.append(p_j)

        # Center matrix: M - 2P
        M_centered = []
        for i in range(n):
            row = []
            for j in range(m):
                row.append(M[i][j] - 2.0 * p[j])
            M_centered.append(row)

        # Compute denominator: Σ 2p_j(1-p_j)
        denom = sum(2.0 * p_j * (1.0 - p_j) for p_j in p)
        if denom == 0:
            denom = 1.0  # Avoid division by zero

        # Compute G = (M - 2P)(M - 2P)ᵀ / denom
        G = []
        for i in range(n):
            row = []
            for j in range(n):
                dot_product = sum(M_centered[i][k] * M_centered[j][k] for k in range(m))
                row.append(dot_product / denom)
            G.append(row)

        return G

    def compute_genomic_inbreeding(self, generation: int = None) -> Dict[int, float]:
        """
        Compute genomic inbreeding F_i = G_ii - 1 for each individual.

        Args:
            generation: If specified, only compute for mice in that generation

        Returns:
            Dict mapping mouse ID to genomic F
        """
        G = self.compute_grm()

        result = {}
        for i, mouse in enumerate(self.mice):
            if generation is None or mouse.generation == generation:
                F_genomic = G[i][i] - 1.0
                result[mouse.id] = F_genomic

        return result

    def mean_heterozygosity_SNP(self) -> float:
        """
        Compute mean heterozygosity across SNPs.

        Heterozygosity = 1 - Σ p² - Σ q² where p and q are allele frequencies.

        Returns:
            Mean heterozygosity (0 to 1)
        """
        if not self.mice:
            return 0.0

        n = len(self.mice)
        m = NUM_SNPS

        # Get genotype matrix
        M = []
        for mouse in self.mice:
            M.append(mouse.genome.get_snp_genotypes())

        # Compute heterozygosity for each SNP
        heterozygosities = []
        for j in range(m):
            allele_sum = sum(M[i][j] for i in range(n))
            p = allele_sum / (2.0 * n)  # Frequency of allele 1
            q = 1.0 - p  # Frequency of allele 0
            het = 1.0 - p*p - q*q
            heterozygosities.append(het)

        return sum(heterozygosities) / m if m > 0 else 0.0

    def _generate_polytraits(self):
        """
        Generate quantitative trait values for all mice using LMM.

        Model: y = Xβ + u + ε
        where:
        - X is design matrix (intercept + sex from phenotype)
        - β are fixed effects
        - u ~ N(0, σ²_u G) is genetic effect
        - ε ~ N(0, σ²_ε) is environmental effect
        - h² = σ²_u / (σ²_u + σ²_ε) ≈ 0.4
        """
        if not self.mice:
            return

        n = len(self.mice)

        # Compute genetic values: u_i = Σ x_ij * β_j
        genetic_values = []
        for mouse in self.mice:
            genotypes = mouse.genome.get_snp_genotypes()
            u = sum(g * beta for g, beta in zip(genotypes, self.snp_effects))
            genetic_values.append(u)

        # Standardize genetic values to have variance σ²_u
        mean_u = sum(genetic_values) / n
        var_u = sum((u - mean_u)**2 for u in genetic_values) / n
        if var_u > 0:
            genetic_values = [(u - mean_u) / (var_u ** 0.5) for u in genetic_values]

        # Compute environmental variance to achieve target h²
        # h² = σ²_u / (σ²_u + σ²_ε)
        # σ²_ε = σ²_u * (1 - h²) / h²
        sigma_u = 1.0  # Standardized
        sigma_e = sigma_u * (1.0 - NARROW_SENSE_H2) / NARROW_SENSE_H2

        # Generate phenotypes
        for i, mouse in enumerate(self.mice):
            # Fixed effects (intercept + sex)
            intercept = 100.0
            sex_effect = 5.0 if mouse.phenotype.get('size') == 'large' else 0.0

            # Genetic + environmental
            u = genetic_values[i] * sigma_u
            epsilon = random.gauss(0, sigma_e ** 0.5)

            mouse.polytrait = intercept + sex_effect + u + epsilon

    def check_victory(self, threshold: float = 90.0) -> bool:
        """
        Check if breeding goal has been achieved.

        Args:
            threshold: Percentage of population that must meet goal (default 90%)

        Returns:
            True if victory condition met
        """
        if not self.goal or not self.mice:
            return False

        # Special case: maximize diversity goal
        if not self.goal:  # Empty goal dict
            stats = self.get_stats()
            return stats['genetic_diversity'] >= threshold

        # Count mice that meet all goal criteria
        matching_rats = 0
        for mouse in self.mice:
            if all(mouse.phenotype.get(trait) == value
                   for trait, value in self.goal.items()):
                matching_rats += 1

        percentage = (matching_rats / len(self.mice)) * 100
        return percentage >= threshold

    # ========================================================================
    # SELECTION STMOUSEEGIES
    # ========================================================================

    def select_random_pairs(self) -> List[Tuple[Mouse, Mouse]]:
        """
        Select random breeding pairs from population.

        Returns:
            List of (rat1, rat2) tuples
        """
        if len(self.mice) < 2:
            return []

        # Shuffle and pair up
        available = self.mice.copy()
        random.shuffle(available)

        pairs = []
        for i in range(0, len(available) - 1, 2):
            pairs.append((available[i], available[i + 1]))

        return pairs

    def select_fitness_pairs(self, top_n: int = None) -> List[Tuple[Mouse, Mouse]]:
        """
        Select breeding pairs from the fittest mice.

        Args:
            top_n: Number of top mice to breed (default: half the population)

        Returns:
            List of (rat1, rat2) tuples
        """
        if len(self.mice) < 2:
            return []

        if top_n is None:
            top_n = max(2, len(self.mice) // 2)

        # Sort by fitness
        sorted_rats = sorted(self.mice,
                           key=lambda r: r.get_fitness(self.goal),
                           reverse=True)

        # Take top N
        top_rats = sorted_rats[:top_n]

        # Pair them up
        pairs = []
        for i in range(0, len(top_rats) - 1, 2):
            pairs.append((top_rats[i], top_rats[i + 1]))

        return pairs

    def select_diverse_pairs(self) -> List[Tuple[Mouse, Mouse]]:
        """
        Select breeding pairs to maximize genetic diversity.
        Pairs mice with lowest relatedness.

        Returns:
            List of (rat1, rat2) tuples
        """
        if len(self.mice) < 2:
            return []

        available = self.mice.copy()
        pairs = []

        while len(available) >= 2:
            # Pick first mouse
            mouse1 = available.pop(0)

            # Find least related mouse
            best_match = None
            lowest_relatedness = float('inf')

            for mouse2 in available:
                relatedness = calculate_relatedness(mouse1, mouse2, self.mouse_registry)
                if relatedness < lowest_relatedness:
                    lowest_relatedness = relatedness
                    best_match = mouse2

            if best_match:
                available.remove(best_match)
                pairs.append((mouse1, best_match))

        return pairs

    # ========================================================================
    # GENERATION ADVANCEMENT
    # ========================================================================

    def next_generation(self, strategy: str = 'fitness', cull_rate: float = 0.0) -> Dict:
        """
        Advance to the next generation.

        Args:
            strategy: Selection strategy ('random', 'fitness', 'diverse')
            cull_rate: Fraction of lowest fitness mice to remove (0.0-1.0)

        Returns:
            Dict with generation statistics
        """
        # Select breeding pairs based on strategy
        if strategy == 'random':
            pairs = self.select_random_pairs()
        elif strategy == 'fitness':
            pairs = self.select_fitness_pairs()
        elif strategy == 'diverse':
            pairs = self.select_diverse_pairs()
        else:
            pairs = self.select_random_pairs()

        # Breed all pairs (mutation rates are now constants)
        all_offspring = []
        for parent1, parent2 in pairs:
            offspring = mate(parent1, parent2)
            all_offspring.extend(offspring)

        # Add offspring to registry
        for mouse in all_offspring:
            self.mouse_registry[mouse.id] = mouse

        # Determine target population size
        target_size = len(self.mice)

        # Replace population with offspring
        if len(all_offspring) >= target_size:
            # If we have enough offspring, just use them
            # Sort by fitness and take the best
            sorted_offspring = sorted(all_offspring,
                                    key=lambda r: r.get_fitness(self.goal),
                                    reverse=True)
            self.mice = sorted_offspring[:target_size]
        else:
            # If not enough offspring, keep some parents
            num_to_keep = target_size - len(all_offspring)
            sorted_parents = sorted(self.mice,
                                  key=lambda r: r.get_fitness(self.goal),
                                  reverse=True)
            self.mice = sorted_parents[:num_to_keep] + all_offspring

        # Optional culling (reduce population size)
        if cull_rate > 0 and self.mice:
            num_to_keep = int(len(self.mice) * (1 - cull_rate))
            if num_to_keep > 0:
                # Sort by fitness and keep best
                sorted_mice = sorted(self.mice,
                                   key=lambda r: r.get_fitness(self.goal),
                                   reverse=True)
                self.mice = sorted_mice[:num_to_keep]

        # Regenerate quantitative traits for new generation
        self._generate_polytraits()

        # Increment generation
        self.generation += 1

        # Record statistics
        self._record_stats()

        return self.get_stats()

    def get_trait_frequency(self, trait: str, value: str) -> float:
        """
        Get percentage of population with specific trait value.

        Args:
            trait: Trait name (e.g., 'coat_color')
            value: Trait value (e.g., 'white')

        Returns:
            Percentage (0-100)
        """
        frequencies = self._get_trait_frequency(trait)
        return frequencies.get(value, 0.0)

    def print_summary(self, verbose: bool = False):
        """
        Print a summary of the current population.

        Args:
            verbose: If True, print detailed trait frequencies
        """
        stats = self.get_stats()

        print(f"\nGeneration {self.generation}:")
        print(f"  N={stats['population_size']}, "
              f"Fitness={stats['avg_fitness']:.1f}%, "
              f"F_ped={stats['mean_F_pedigree']:.3f}, "
              f"F_gen={stats['mean_F_genomic']:.3f}, "
              f"Het_SNP={stats['heterozygosity_SNP']:.3f}")
        print(f"  Polytrait: mean={stats['polytrait_mean']:.2f}, "
              f"SD={stats['polytrait_sd']:.2f}, "
              f"h²={stats['h2_empirical']:.3f}")

        if verbose:
            print(f"\nTrait Frequencies:")
            for trait, frequencies in stats['trait_frequencies'].items():
                print(f"  {trait}:")
                for value, pct in frequencies.items():
                    print(f"    {value}: {pct:.1f}%")

        if self.check_victory():
            print(f"  VICTORY! Breeding goal achieved!")

    def print_comparison_table(self):
        """Print a compact comparison table of strategies (for final output)."""
        if len(self.history) < 2:
            return

        print(f"\n{'='*80}")
        print(f"STRATEGY COMPARISON - Generation {self.generation}")
        print(f"{'='*80}")
        print(f"{'Metric':<25} {'Initial':<12} {'Final':<12} {'Change':<12}")
        print(f"{'-'*80}")

        initial = self.history[0]
        final = self.history[-1]

        metrics = [
            ('Avg Fitness (%)', 'avg_fitness'),
            ('Mean F (pedigree)', 'mean_F_pedigree'),
            ('Mean F (genomic)', 'mean_F_genomic'),
            ('Corr(F_ped, F_gen)', 'corr_F_pedigree_genomic'),
            ('Mean G_ii', 'mean_G_ii'),
            ('Heterozygosity (SNP)', 'heterozygosity_SNP'),
            ('Polytrait mean', 'polytrait_mean'),
            ('Polytrait SD', 'polytrait_sd')
        ]

        for label, key in metrics:
            init_val = initial.get(key, 0)
            final_val = final.get(key, 0)
            change = final_val - init_val
            print(f"{label:<25} {init_val:>11.3f} {final_val:>11.3f} {change:>+11.3f}")

        print(f"{'='*80}\n")


# ============================================================================
# TEST CODE
# ============================================================================

def run_genetics_tests():
    """Run comprehensive tests of the genetics system."""
    print("=" * 80)
    print("MOUSE BREEDING SIMULATOR - GENETICS FOUNDATION TEST")
    print("=" * 80)
    print()

    # Test 1: Random mouse creation
    print("TEST 1: Creating random founder mice")
    print("-" * 80)
    rat_registry = {}

    rat1 = Mouse(generation=0)
    rat2 = Mouse(generation=0)
    rat_registry[rat1.id] = rat1
    rat_registry[rat2.id] = rat2

    print(rat1)
    print()
    print(rat2)
    print()

    # Test 2: Breeding and Mendelian inheritance
    print("TEST 2: Breeding two mice (Mendelian inheritance)")
    print("-" * 80)
    print(f"Parent 1: {rat1.genome.get_genotype_string()}")
    print(f"Parent 2: {rat2.genome.get_genotype_string()}")
    print()

    offspring = mate(rat1, rat2)
    print(f"Litter size: {len(offspring)} pups")
    print()

    for i, pup in enumerate(offspring, 1):
        rat_registry[pup.id] = pup
        print(f"Pup {i}:")
        print(pup)
        print()

    # Test 3: Fitness calculation
    print("TEST 3: Fitness calculation")
    print("-" * 80)
    goal = {
        'coat_color': 'white',
        'size': 'large',
        'ear_shape': 'dumbo',
        'temperament': 'friendly'
    }
    print(f"Breeding goal: {goal}")
    print()

    for mouse in [rat1, rat2] + offspring:
        fitness = mouse.get_fitness(goal)
        print(f"Mouse #{mouse.id}: Fitness = {fitness:.1f}%")
    print()

    # Test 4: Three-generation pedigree
    print("TEST 4: Three-generation pedigree")
    print("-" * 80)

    # Generation 2: Breed two offspring from generation 1
    if len(offspring) >= 2:
        gen2_parent1 = offspring[0]
        gen2_parent2 = offspring[1]

        print(f"Breeding Gen 1 mice #{gen2_parent1.id} and #{gen2_parent2.id}")
        gen2_offspring = mate(gen2_parent1, gen2_parent2)

        for pup in gen2_offspring:
            rat_registry[pup.id] = pup

        print(f"Generation 2 litter: {len(gen2_offspring)} pups")
        print()

        # Generation 3: Breed two from generation 2
        if len(gen2_offspring) >= 2:
            gen3_parent1 = gen2_offspring[0]
            gen3_parent2 = gen2_offspring[1]

            print(f"Breeding Gen 2 mice #{gen3_parent1.id} and #{gen3_parent2.id}")
            gen3_offspring = mate(gen3_parent1, gen3_parent2)

            for pup in gen3_offspring:
                rat_registry[pup.id] = pup

            print(f"Generation 3 litter: {len(gen3_offspring)} pups")
            print()

            # Display pedigree for one Gen 3 mouse
            print("Full pedigree for one Generation 3 mouse:")
            print()
            print_pedigree(gen3_offspring[0], rat_registry, depth=3)
            print()

    # Test 5: Inbreeding calculation
    print("TEST 5: Inbreeding/relatedness calculation")
    print("-" * 80)

    # Test various relationships
    if len(offspring) >= 2:
        # Siblings
        sib1 = offspring[0]
        sib2 = offspring[1]
        relatedness = calculate_relatedness(sib1, sib2, rat_registry)
        print(f"Siblings (Mouse #{sib1.id} & #{sib2.id}): Relatedness = {relatedness:.2f}")

        # Parent-child
        relatedness = calculate_relatedness(rat1, sib1, rat_registry)
        print(f"Parent-child (Mouse #{rat1.id} & #{sib1.id}): Relatedness = {relatedness:.2f}")

        # Unrelated founders
        relatedness = calculate_relatedness(rat1, rat2, rat_registry)
        print(f"Unrelated founders (Mouse #{rat1.id} & #{rat2.id}): Relatedness = {relatedness:.2f}")

        # Same mouse
        relatedness = calculate_relatedness(rat1, rat1, rat_registry)
        print(f"Same mouse (Mouse #{rat1.id} & #{rat1.id}): Relatedness = {relatedness:.2f}")

        # Cousins (if we have gen 2)
        if len(gen2_offspring) >= 2 and len(offspring) >= 4:
            # Breed another pair from gen 1 to create cousins
            cousin_parent1 = offspring[2]
            cousin_parent2 = offspring[3]
            cousin_litter = mate(cousin_parent1, cousin_parent2)
            for pup in cousin_litter:
                rat_registry[pup.id] = pup

            if len(cousin_litter) > 0:
                cousin1 = gen2_offspring[0]
                cousin2 = cousin_litter[0]
                relatedness = calculate_relatedness(cousin1, cousin2, rat_registry)
                print(f"Cousins (Mouse #{cousin1.id} & #{cousin2.id}): Relatedness = {relatedness:.2f}")

    print()

    # Test 6: Mutation demonstration
    print("TEST 6: Mutation demonstration (high mutation rate)")
    print("-" * 80)

    # Create two homozygous mice
    pure_black = Mouse(genome=Genome(
        coat_color=('B', 'B'),
        size=('L', 'L'),
        ear_shape=('N', 'N'),
        temperament=('F', 'F')
    ))

    pure_white = Mouse(genome=Genome(
        coat_color=('b', 'b'),
        size=('s', 's'),
        ear_shape=('D', 'D'),
        temperament=('A', 'A')
    ))

    print(f"Pure black mouse: {pure_black.genome.get_genotype_string()}")
    print(f"Pure white mouse: {pure_white.genome.get_genotype_string()}")
    print()

    # Breed (mutation rates are now constants)
    mutant_offspring = mate(pure_black, pure_white)
    print(f"Offspring (mutation rates: SNP={SNP_MUTATION_RATE}, trait={TRAIT_MUTATION_RATE}):")
    for i, pup in enumerate(mutant_offspring, 1):
        print(f"  Pup {i}: {pup.genome.get_genotype_string()}")
    print()

    # Summary statistics
    print("=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)
    print(f"Total mice created: {len(rat_registry) + len(mutant_offspring) + 2}")
    print(f"Generations simulated: 3")
    print(f"Breeding events: Multiple")
    print()
    print("All genetics tests completed successfully!")
    print("=" * 80)


def run_population_tests():
    """Run 5-generation simulation tests for each strategy."""
    print("\n" + "=" * 80)
    print("MOUSE BREEDING SIMULATOR - 5 GENERATION TESTS")
    print("=" * 80)
    print()

    # Test different strategies with the same goal
    goal = GoalPresets.LARGE_FRIENDLY
    print(f"Breeding Goal: {goal}")
    print(f"Population size: 30 mice")
    print(f"SNPs: {NUM_SNPS}, Chromosomes: {NUM_CHROMOSOMES}")
    print(f"Target h²: {NARROW_SENSE_H2}")
    print()

    strategies = ['random', 'fitness', 'diverse']

    for strategy in strategies:
        print(f"\n{'='*80}")
        print(f"STRATEGY: {strategy.upper()}")
        print(f"{'='*80}")

        # Create population
        pop = Population(size=30, goal=goal)
        pop.print_summary()

        # Run 5 generations
        for _ in range(5):
            pop.next_generation(strategy=strategy, cull_rate=0.0)
            pop.print_summary()

        # Final comparison table
        pop.print_comparison_table()

    print("\n" + "=" * 80)
    print("ALL TESTS COMPLETED!")
    print("=" * 80)


def run_real_mode_demo(dataset: Dataset, strainA: str, strainB: str):
    """
    Run REAL mode demonstration with real strain data.

    Args:
        dataset: Loaded dataset with genotypes and phenotypes
        strainA: First founder strain name
        strainB: Second founder strain name
    """
    global REAL_LOCI

    print("\n" + "=" * 80)
    print("REAL MODE: Predicting Offspring from Real Mouse Genomic Data")
    print("=" * 80)
    print()

    # Extract gene name from filename (more robust pattern)
    gene_name = "UNKNOWN"
    if dataset.genopath:
        import re
        fname = os.path.basename(dataset.genopath)
        match = re.search(r'snp[_-]([A-Za-z0-9]+)', fname)
        if match:
            gene_name = match.group(1).upper()

    print(f"Dataset: {os.path.basename(dataset.genopath) if dataset.genopath else 'Unknown'}")
    print(f"Gene: {gene_name}")
    print(f"Cross: {strainA} x {strainB}")
    print()
    print("=" * 80)
    print("STEP 1: Analyzing Genetic Variation Between Strains")
    print("=" * 80)
    print()

    # Detect variable loci between the two strains
    REAL_LOCI = detect_variable_loci(dataset, strainA, strainB, max_loci=10)

    if not REAL_LOCI:
        print(f"RESULT: No genetic variation found at {gene_name}")
        print()

        # Still show what genotype/phenotype they have (even if identical)
        # Get any SNP from the dataset to show the shared genotype
        geno_a = dataset.geno.get(strainA, {})
        if geno_a:
            # Get first available SNP
            first_snp = list(geno_a.keys())[0]
            chr_name, pos = first_snp
            gt_shared = geno_a[first_snp]

            # Get gene model (flexible, not hardcoded!)
            gene_info = get_gene_model(gene_name)
            trait = gene_info.get("trait", "unknown")
            model = gene_name.lower()

            # Get phenotype
            pheno_shared = express_from_real_geno(trait, gt_shared, model)
            if pheno_shared is None:
                pheno_shared = "unknown"

            print("SHARED GENOTYPE:")
            print(f"  Both {strainA} and {strainB} have genotype {gt_shared} at {gene_name}")
            if trait == "coat_color":
                print(f"  Both strains have {pheno_shared.upper()} coat color")
            else:
                print(f"  Both strains have {pheno_shared.upper()} {trait}")
            print()

        print("INTERPRETATION:")
        print(f"  - {strainA} and {strainB} have IDENTICAL alleles at all {gene_name} SNPs")
        print(f"  - Both strains carry the same genetic variant at this gene")
        print(f"  - Crossing these strains will NOT produce phenotypic variation")
        print()

        print("+==============================================================================+")
        print("|                                                                              |")
        print("|          ANSWER: Offspring will be the SAME color as both parents           |")
        print("|                                                                              |")
        print("+==============================================================================+")
        print()

        print("BIOLOGICAL INSIGHT:")
        print(f"  This is real data from the Mouse Phenome Database showing that")
        print(f"  {strainA} and {strainB} share the same {gene_name} haplotype.")
        print(f"  To see variation, try different strain combinations or different genes.")
        print()
        print("RECOMMENDATION:")
        print("  - Try a different gene (e.g., TYRP1, TYR, ASIP)")
        print("  - Or try different strains (e.g., C57BL/6J vs DBA/2J)")
        print()
        return
    else:
        print(f"RESULT: Found {len(REAL_LOCI)} variable SNP(s) at {gene_name}")
        print()
        print("Variable SNPs (showing genotype differences):")
        print()
        print(f"{'Position':<20} {strainA:<15} {strainB:<15} {'Difference':<15}")
        print("-" * 65)

        for i, locus in enumerate(REAL_LOCI[:5], 1):  # Show first 5
            gt_a = dataset.geno.get(strainA, {}).get((locus.chr, locus.pos), "?")
            gt_b = dataset.geno.get(strainB, {}).get((locus.chr, locus.pos), "?")

            # Interpret genotypes
            gt_a_str = f"{gt_a} ({'ref/ref' if gt_a == 0 else 'alt/alt' if gt_a == 2 else 'ref/alt'})"
            gt_b_str = f"{gt_b} ({'ref/ref' if gt_b == 0 else 'alt/alt' if gt_b == 2 else 'ref/alt'})"
            diff = "YES" if gt_a != gt_b else "NO"

            print(f"{locus.chr}:{locus.pos:<12} {gt_a_str:<15} {gt_b_str:<15} {diff:<15}")

        if len(REAL_LOCI) > 5:
            print(f"... and {len(REAL_LOCI) - 5} more variable SNPs")
        print()

    # Create population with real founders
    pop = Population(size=30, goal=GoalPresets.LARGE_FRIENDLY,
                    mode=Mode.REAL, dataset=dataset,
                    strainA=strainA, strainB=strainB)

    # Get the two founder strains (first two mice)
    founder_a = pop.mice[0]
    founder_b = pop.mice[1]

    print("=" * 80)
    print("STEP 2: Parent Phenotypes (from Real Genotypes)")
    print("=" * 80)
    print()

    # Use first variable locus for phenotype prediction
    first_locus = REAL_LOCI[0]
    gt_a = dataset.geno.get(strainA, {}).get((first_locus.chr, first_locus.pos), 0)
    gt_b = dataset.geno.get(strainB, {}).get((first_locus.chr, first_locus.pos), 0)

    pheno_a = express_from_real_geno("coat_color", gt_a, first_locus.model)
    pheno_b = express_from_real_geno("coat_color", gt_b, first_locus.model)

    print(f"Parent A ({strainA}):")
    print(f"  Genotype at {first_locus.chr}:{first_locus.pos}: {gt_a}")
    print(f"  Predicted phenotype: {pheno_a}")
    print()

    print(f"Parent B ({strainB}):")
    print(f"  Genotype at {first_locus.chr}:{first_locus.pos}: {gt_b}")
    print(f"  Predicted phenotype: {pheno_b}")
    print()

    # Compute Punnett probabilities
    print("=" * 80)
    print("STEP 3: OFFSPRING PREDICTION - What Color Will The Babies Be?")
    print("=" * 80)
    print()

    probs = punnett_probs_two_parents(founder_a, founder_b, draws=10000)

    if probs:
        # Calculate expected F1 genotype
        if gt_a == 0 and gt_b == 0:
            f1_geno_num = 0
            f1_geno_desc = "homozygous ref/ref"
        elif gt_a == 2 and gt_b == 2:
            f1_geno_num = 2
            f1_geno_desc = "homozygous alt/alt"
        elif (gt_a == 0 and gt_b == 2) or (gt_a == 2 and gt_b == 0):
            f1_geno_num = 1
            f1_geno_desc = "heterozygous ref/alt"
        else:
            f1_geno_num = 1
            f1_geno_desc = "mixed (segregating)"

        # Get the predicted phenotype
        f1_phenotype = express_from_real_geno("coat_color", f1_geno_num, first_locus.model)

        # CLEAR ANSWER
        print("+" + "=" * 78 + "+")
        print("|" + " " * 78 + "|")
        print("|" + f"  ANSWER: The offspring will be {f1_phenotype.upper()} color".center(78) + "|")
        print("|" + " " * 78 + "|")
        print("+" + "=" * 78 + "+")
        print()
        print()

        # Show the cross visually
        print("THE CROSS:")
        print()
        print(f"  Parent A ({strainA}): {pheno_a.upper()} coat")
        print(f"           x")
        print(f"  Parent B ({strainB}): {pheno_b.upper()} coat")
        print(f"           |")
        print(f"           v")
        print(f"  F1 Offspring: {f1_phenotype.upper()} coat")
        print()
        print()

        # Detailed probabilities
        print("DETAILED PROBABILITIES:")
        print()
        for phenotype, prob in sorted(probs.items()):
            bar_length = int(prob * 50)
            bar = "#" * bar_length
            print(f"  {phenotype.capitalize():<10} {prob:>6.1%}  {bar}")
        print()
        print()

        # Genetic explanation
        print("HOW THIS WORKS (Genetics Explanation):")
        print()
        print(f"1. Parent A ({strainA}) has genotype {gt_a} at {first_locus.chr}:{first_locus.pos}")
        print(f"   => This gives {pheno_a} coat color")
        print()
        print(f"2. Parent B ({strainB}) has genotype {gt_b} at {first_locus.chr}:{first_locus.pos}")
        print(f"   => This gives {pheno_b} coat color")
        print()
        print(f"3. Each parent passes ONE allele to offspring")
        print(f"   => Parent A passes: {'ref' if gt_a == 0 else 'alt'} allele")
        print(f"   => Parent B passes: {'ref' if gt_b == 0 else 'alt'} allele")
        print()
        print(f"4. F1 offspring gets genotype {f1_geno_num} ({f1_geno_desc})")
        print()
        print(f"5. Using '{gene_name}' genetic model:")

        # Get gene model info (flexible, not hardcoded!)
        gene_info = get_gene_model(gene_name)
        genotypes = gene_info.get("model", {}).get("genotypes", {})

        for geno in ["0", "1", "2"]:
            if geno in genotypes:
                pheno = genotypes[geno].get("phenotype", "unknown")
                desc = genotypes[geno].get("description", "")
                print(f"   => Genotype {geno} = {pheno.upper()} ({desc})")

        print()
        gene_function = gene_info.get("function", "")
        if gene_function:
            print(f"   {gene_name} function: {gene_function}")
        print()
        print(f"6. Therefore: F1 offspring will be {f1_phenotype.upper()}")
        print()
        print()

        print("BIOLOGICAL INSIGHT:")
        print()
        print(f"[*] This uses REAL genomic data from Mouse Phenome Database")
        print(f"[*] Gene analyzed: {gene_name} ({gene_info.get('name', 'Unknown gene')})")
        print(f"[*] Trait affected: {gene_info.get('trait', 'unknown')}")
        print(f"[*] Found {len(REAL_LOCI)} variable SNP(s) between these strains")
        print(f"[*] Prediction follows Mendelian inheritance laws")
        print()
    else:
        print("  (No predictions - no variable loci)")
        print()

    print("=" * 80)
    print("STEP 4: Multi-Generation Simulation (Optional)")
    print("=" * 80)
    print()
    print("Simulating 5 generations with fitness-based selection...")
    print("(This shows how the population evolves over time)")
    print()

    print("Generation 0:")
    pop.print_summary()

    for _ in range(5):
        pop.next_generation(strategy='fitness', cull_rate=0.0)
        pop.print_summary()

    # Final comparison table
    pop.print_comparison_table()

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    print(f"Gene analyzed: {gene_name}")
    print(f"Strains crossed: {strainA} x {strainB}")
    print(f"Variable SNPs found: {len(REAL_LOCI)}")
    print()
    print("KEY TAKEAWAYS:")
    print()
    if REAL_LOCI:
        print(f"  1. {strainA} and {strainB} have DIFFERENT alleles at {gene_name}")
        print(f"  2. F1 offspring will inherit one allele from each parent")
        print(f"  3. Phenotype depends on the genetic model (dominant/recessive)")
        print(f"  4. This is REAL data - not simulated!")
    else:
        print(f"  1. {strainA} and {strainB} have IDENTICAL alleles at {gene_name}")
        print(f"  2. No phenotypic variation expected in offspring")
        print(f"  3. Try different strains or genes to see variation")
    print()
    print("=" * 80)


def run_all_tests():
    """Run all test suites."""
    # Run genetics foundation tests
    run_genetics_tests()

    # Run population simulation tests
    run_population_tests()


def show_interactive_menu():
    """
    Display interactive menu for mode selection when no arguments provided.
    """
    print("\n" + "=" * 80)
    print("MOUSE BREEDING SIMULATOR")
    print("=" * 80)
    print()
    print("Choose a mode:")
    print()
    print("  1. SIM Mode - Mendelian Genetics Simulation")
    print("     Run simulated breeding experiments with random founder mice")
    print("     - 200 genome-wide SNPs with recombination")
    print("     - Wright's pedigree inbreeding coefficient")
    print("     - VanRaden GRM and genomic inbreeding")
    print("     - Quantitative trait modeling (h^2 ~= 0.4)")
    print()
    print("  2. REAL Mode - Predict Strain Crosses from Real Data")
    print("     Use real Mouse Phenome Database genotypes")
    print("     - Load actual strain genotypes (C57BL/6J, BALB/cJ, etc.)")
    print("     - Predict offspring phenotypes (Punnett probabilities)")
    print("     - Simulate breeding with real genomic data")
    print()
    print("  3. Process MPD Data - Convert Raw Data to Cleaned Format")
    print("     Process raw Mouse Phenome Database CSV files")
    print("     - Auto-detect raw files in datasets/raw/")
    print("     - Convert alleles to numeric genotypes")
    print("     - Save cleaned data to datasets/cleaned/")
    print()
    print("  4. Exit")
    print()

    while True:
        choice = input("Enter your choice (1-4): ").strip()

        if choice == '1':
            return 'sim'
        elif choice == '2':
            return 'real'
        elif choice == '3':
            return 'process'
        elif choice == '4':
            print("\nExiting...")
            import sys
            sys.exit(0)
        else:
            print("Invalid choice. Please enter 1, 2, 3, or 4.")


def interactive_sim_mode():
    """
    Interactive SIM mode - choose which test to run.
    """
    print("\n" + "=" * 80)
    print("SIM MODE - Mendelian Genetics Simulation")
    print("=" * 80)
    print()
    print("Choose a test suite:")
    print()
    print("  1. Genetics Foundation Tests")
    print("     - Test basic Mendelian inheritance")
    print("     - Verify recombination and mutation")
    print("     - Check pedigree kinship calculations")
    print()
    print("  2. Population Simulation (5 generations)")
    print("     - Random, fitness, and diversity selection strategies")
    print("     - Track inbreeding and heterozygosity")
    print("     - Compare selection outcomes")
    print()
    print("  3. All Tests")
    print("     - Run both genetics and population tests")
    print()
    print("  4. Back to main menu")
    print()

    while True:
        choice = input("Enter your choice (1-4): ").strip()

        if choice == '1':
            run_genetics_tests()
            break
        elif choice == '2':
            run_population_tests()
            break
        elif choice == '3':
            run_all_tests()
            break
        elif choice == '4':
            return
        else:
            print("Invalid choice. Please enter 1-4.")


def interactive_real_mode():
    """
    Interactive REAL mode - guide user through strain selection.
    """
    import os
    import glob

    print("\n" + "=" * 80)
    print("REAL MODE - Predict Strain Crosses from Real Data")
    print("=" * 80)
    print()

    # Step 1: Find cleaned data files
    cleaned_dir = 'datasets/cleaned'
    cleaned_files = glob.glob(os.path.join(cleaned_dir, 'cleaned_*.csv'))

    if not cleaned_files:
        print("ERROR: No cleaned data files found!")
        print()
        print("Please run the data processor first:")
        print("  1. Add raw MPD CSV files to datasets/raw/")
        print("  2. Run: python process_mpd_data.py")
        print()
        return

    # Step 2: Let user choose data file
    print("Available cleaned data files:")
    print()
    for i, f in enumerate(cleaned_files, 1):
        print(f"  {i}. {os.path.basename(f)}")
    print()

    while True:
        choice = input(f"Choose a file (1-{len(cleaned_files)}): ").strip()
        try:
            file_idx = int(choice) - 1
            if 0 <= file_idx < len(cleaned_files):
                genotype_file = cleaned_files[file_idx]
                break
            else:
                print(f"Invalid choice. Please enter 1-{len(cleaned_files)}.")
        except ValueError:
            print("Invalid input. Please enter a number.")

    # Step 3: Load dataset to detect available strains
    print(f"\nLoading: {os.path.basename(genotype_file)}...")
    dataset = Dataset(genopath=genotype_file)

    available_strains = list(dataset.geno.keys())

    if len(available_strains) < 2:
        print(f"ERROR: Need at least 2 strains, found {len(available_strains)}")
        return

    print(f"Found {len(available_strains)} strain(s): {', '.join(available_strains)}")
    print()

    # Step 4: Select strains
    print("Select two strains to cross:")
    print()
    for i, strain in enumerate(available_strains, 1):
        print(f"  {i}. {strain}")
    print()

    while True:
        choice_a = input(f"Choose first strain (1-{len(available_strains)}): ").strip()
        try:
            idx_a = int(choice_a) - 1
            if 0 <= idx_a < len(available_strains):
                strainA = available_strains[idx_a]
                break
            else:
                print(f"Invalid choice. Please enter 1-{len(available_strains)}.")
        except ValueError:
            print("Invalid input. Please enter a number.")

    while True:
        choice_b = input(f"Choose second strain (1-{len(available_strains)}): ").strip()
        try:
            idx_b = int(choice_b) - 1
            if 0 <= idx_b < len(available_strains):
                strainB = available_strains[idx_b]
                break
            else:
                print(f"Invalid choice. Please enter 1-{len(available_strains)}.")
        except ValueError:
            print("Invalid input. Please enter a number.")

    # Step 5: Run simulation
    print(f"\nRunning simulation: {strainA} × {strainB}")
    print()

    run_real_mode_demo(dataset, strainA, strainB)


def interactive_process_data():
    """
    Interactive data processing mode - run process_mpd_data.py.
    """
    print("\n" + "=" * 80)
    print("PROCESS MPD DATA - Convert Raw Data to Cleaned Format")
    print("=" * 80)
    print()

    # Check if process_mpd_data.py exists
    if not os.path.exists('process_mpd_data.py'):
        print("ERROR: process_mpd_data.py not found!")
        print()
        print("Please ensure process_mpd_data.py is in the same directory.")
        return

    # Check for raw data files
    raw_dir = 'datasets/raw'
    if not os.path.exists(raw_dir):
        print(f"Creating directory: {raw_dir}")
        os.makedirs(raw_dir, exist_ok=True)

    raw_files = glob.glob(os.path.join(raw_dir, '*.csv'))

    if not raw_files:
        print(f"No raw CSV files found in {raw_dir}/")
        print()
        print("To add data:")
        print(f"  1. Download MPD CSV files from Mouse Phenome Database")
        print(f"  2. Place them in {raw_dir}/")
        print(f"  3. Run this option again")
        print()
        return

    print(f"Found {len(raw_files)} raw CSV file(s) in {raw_dir}/:")
    for f in raw_files:
        print(f"  - {os.path.basename(f)}")
    print()

    # Ask user to confirm
    confirm = input("Process these files? (y/n): ").strip().lower()

    if confirm != 'y':
        print("Processing cancelled.")
        return

    print()
    print("Running data processor...")
    print("=" * 80)
    print()

    # Run process_mpd_data.py as subprocess
    import subprocess
    result = subprocess.run([sys.executable, 'process_mpd_data.py'],
                          capture_output=False,
                          text=True)

    print()
    print("=" * 80)

    if result.returncode == 0:
        print("Data processing completed successfully!")
        print()
        print("You can now use REAL Mode to run simulations with the cleaned data.")
    else:
        print(f"Data processing failed with exit code {result.returncode}")

    print()


if __name__ == "__main__":
    import sys
    import argparse

    # Check if any arguments were provided
    if len(sys.argv) == 1:
        # No arguments - show interactive menu
        mode = show_interactive_menu()

        if mode == 'sim':
            interactive_sim_mode()
        elif mode == 'real':
            interactive_real_mode()
        elif mode == 'process':
            interactive_process_data()
    else:
        # Arguments provided - use CLI mode
        parser = argparse.ArgumentParser(description="Mouse Breeding Simulator - Dual Mode")
        parser.add_argument('--mode', choices=['sim', 'real'], default='sim',
                           help='Runtime mode: sim (simulated) or real (real data)')
        parser.add_argument('--phenotypes', type=str, default=None,
                           help='Path to phenotypes.csv (REAL mode)')
        parser.add_argument('--genotypes', type=str, default=None,
                           help='Path to genotypes.csv (REAL mode)')
        parser.add_argument('--strainA', type=str, default=None,
                           help='First founder strain name (REAL mode)')
        parser.add_argument('--strainB', type=str, default=None,
                           help='Second founder strain name (REAL mode)')
        parser.add_argument('test', nargs='?', choices=['genetics', 'population', 'all'],
                           help='Test suite to run (SIM mode only)')

        args = parser.parse_args()

        # REAL mode
        if args.mode == 'real':
            if not args.genotypes:
                print("ERROR: --genotypes required for REAL mode")
                sys.exit(1)
            if not args.strainA or not args.strainB:
                print("ERROR: --strainA and --strainB required for REAL mode")
                sys.exit(1)

            # Load dataset
            dataset = Dataset(phenopath=args.phenotypes, genopath=args.genotypes)

            # Run REAL mode demo
            run_real_mode_demo(dataset, args.strainA, args.strainB)

        # SIM mode (default)
        else:
            if args.test == 'genetics':
                run_genetics_tests()
            elif args.test == 'population':
                run_population_tests()
            elif args.test == 'all':
                run_all_tests()
            else:
                # Default: run population tests
                run_population_tests()

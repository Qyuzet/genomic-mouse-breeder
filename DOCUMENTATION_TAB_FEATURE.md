# Documentation Tab Feature

## Overview

Added a fourth tab called "Documentation" to the web UI that provides comprehensive technical documentation including code structure, mathematical equations, validation methods, and references.

## Design Principles

Professional, academic styling with:
- Black and white color scheme only
- Border-based design (no fill colors)
- Clean, readable typography
- Monospace font for code and equations
- Proper academic citation format

## Implementation

### UI Structure

**Tab Button:**
- Added "Documentation" button to header alongside Simulation, Real Data, and Validation tabs

**Left Sidebar:**
- Navigation menu with 5 sections:
  1. Overview
  2. Code Structure
  3. Mathematical Equations
  4. Validation Methods
  5. References

**Main Content Area:**
- Spans 2 columns (sp-main with gridColumn: "2 / 4")
- Full-height scrollable panel
- Black border, white background
- Professional typography

### Content Sections

#### 1. Overview
- System description
- Core features list (SNPs, recombination, GRM, LMM, etc.)
- Simulation modes (SIM vs REAL)

#### 2. Code Structure
Documents 4 main classes:

**Class: Genome**
- SNP storage (200 markers, 0/1/2 encoding)
- Visible traits (coat_color, size, temperament)
- Methods: get_snp_genotypes(), get_allele_frequencies()

**Class: Mouse**
- Individual representation
- Properties: id, genome, phenotype, parents, generation, polytrait
- Methods: mate(partner, n_offspring)

**Class: Population**
- Population management
- Methods: compute_grm(), compute_genomic_inbreeding(), next_generation()

**Class: Dataset**
- Real strain data loader
- Methods: get_genotype(), predict_cross()

#### 3. Mathematical Equations

**1. Genomic Relationship Matrix (GRM)**
```
G = (1 / Σ 2p_j(1-p_j)) × (M - 2P)(M - 2P)^T
```
- VanRaden (2008) method
- Variables: M (genotype matrix), P (expected genotypes), p_j (allele frequencies)

**2. Pedigree Inbreeding Coefficient**
```
F_X = φ(dam, sire)
```
- Wright's coefficient
- φ(i,j) = kinship coefficient

**3. Genomic Inbreeding**
```
F_genomic = G_ii - 1
```
- Derived from GRM diagonal

**4. Linear Mixed Model (LMM)**
```
y = Xb + Za + e
h^2 = σ^2_a / (σ^2_a + σ^2_e)
```
- Quantitative trait model
- Fixed effects (Xb), random genetic effects (Za), residuals (e)

**5. Chi-Square Test**
```
χ^2 = Σ[(O_i - E_i)^2 / E_i]
```
- Goodness-of-fit test
- Critical value: 5.991 (α=0.05, df=2)

**6. Heritability Estimation**
```
R = h^2 × S
Slope(offspring ~ mid-parent) = h^2
```
- Breeder's equation
- Parent-offspring regression

#### 4. Validation Methods

**Method 1: Mendelian Ratios**
- Test: Aa × Aa → 1:2:1 ratio
- Chi-square test, pass if χ^2 < 5.991

**Method 2: GRM Relationship Accuracy**
- Test 1: Unrelated founders G ≈ 0
- Test 2: Parent-offspring G ≈ 0.5
- Test 3: Full siblings G ≈ 0.5

**Method 3: Inbreeding Correlation**
- Correlation between F_pedigree and F_genomic
- Pass if r > 0.7

**Method 4: Realized Heritability**
- Parent-offspring regression
- Pass if |h^2_realized - 0.4| < 0.15

**Method 5: Real Mode Predictions**
- Validate against Mouse Genome Database
- Pass if accuracy > 80%

#### 5. References

Academic citations in proper format:
- Falconer & Mackay (1996) - Quantitative Genetics
- Mendel (1866) - Plant Hybridization
- Pearson (1900) - Chi-square test
- Pryce et al. (2014) - Inbreeding depression
- VanRaden (2008) - Genomic predictions
- Wright (1922) - Inbreeding coefficients

Data sources:
- Mouse Genome Informatics (MGI)
- Mouse Phenome Database (MPD)

## Styling Details

### Colors
- Text: Black (#000)
- Borders: Black (#000)
- Background: White (#fff)
- Code blocks: Light gray (#f9f9f9)
- Monospace borders: Gray (#ddd)

### Typography
- Headers: Bold, black bottom borders
- Body text: Line height 1.6-1.8 for readability
- Code/equations: Monospace font, 12-14px
- Subscripts/superscripts: Proper HTML tags

### Layout
- Sections separated by black borders
- Padding: 12-20px for comfortable reading
- Margins: Consistent spacing between elements
- No colored backgrounds or highlights

## Files Modified

1. **client/src/components/SinglePage.jsx**
   - Added docSection state
   - Added Documentation tab button
   - Added documentation sidebar navigation
   - Added documentation main content area with 5 sections
   - Updated mode conditional to exclude DOCUMENTATION from population view

## Usage

1. Click "Documentation" tab in header
2. Use left sidebar to navigate between sections
3. Read comprehensive technical documentation
4. All content is professional, academic-style with proper citations

## Benefits

1. **Academic Credibility** - Proper citations and mathematical notation
2. **Professional Appearance** - Clean black/white design
3. **Comprehensive** - Covers code, math, validation, and references
4. **Educational** - Explains complex concepts clearly
5. **Self-Contained** - All documentation in one place
6. **Presentation-Ready** - Suitable for lecturer review


# Breeding Mice

**Computational Biology Final Project**

## Authors

- Riki Awal Syahputra
- Steven Gerald Marlent (Corresponding Author)
- Justin Hadinata

## Supervisor

Zhandos Yessenbayev, B.Sc., M.Sc., Ph.D

## Affiliations

- First Author and Third Author  
  Address Including Country Name  
  Email: first.author@first-third.edu, third.author@first-third.edu

- Second Author  
  Second Company  
  Address Including Country Name  
  Email: second.author@second.com

---

## Abstract

This project presents a comprehensive web based platform for simulating genetic inheritance in mice through computational methods. The system integrates Mendelian genetics, quantitative trait modeling, and real genomic data from the Mouse Phenome Database into a full stack application comprising a FastAPI backend with 24 REST endpoints and a React frontend with dual operational modes. The genetic engine implements recombination via Poisson crossovers, per locus mutation, and quantitative trait inheritance through linear mixed models. Advanced analysis features include Genomic Relationship Matrix computation with color coded visualization, pedigree based and genomic inbreeding coefficient calculation, and realized heritability estimation. Validation testing confirms biological accuracy across Mendelian ratios, relationship coefficients, and inheritance patterns. The interface provides extensive contextual help including strain descriptions, gene explanations, and interactive tooltips to support users without genetics background. Performance benchmarks demonstrate efficient scaling with population creation under 1 second for 100 mice and breeding operations completing in 50 to 200 milliseconds. WebSocket integration enables real time collaborative breeding simulations. The system serves educational purposes by connecting theoretical genetics concepts to practical applications while providing researchers with tools for preliminary experimental design and breeding scheme evaluation.

---

## I. Introduction

Computational biology provides powerful methods for predicting genotype phenotype relationships without requiring time consuming and resource intensive laboratory breeding experiments. While several web based genetics education tools exist, many oversimplify inheritance models, lack integration with real genomic databases, or provide limited extensibility for incorporating additional traits and genetic mechanisms.

Laboratory mouse breeding serves as a cornerstone of biomedical research, enabling studies of human disease models, drug development, and basic genetics. However, physical breeding programs require significant resources including animal housing, veterinary care, and multi generational time commitments. Computational simulation offers an alternative approach for educational purposes and preliminary experimental design.

This project develops a comprehensive genomic breeding simulator for mice with three primary objectives:

1. Implement biologically accurate genetic inheritance including Mendelian genetics, recombination, mutation, and quantitative trait modeling
2. Integrate real genomic data from the Mouse Phenome Database to connect theoretical concepts with research applications
3. Create an accessible web interface with extensive educational support for users without genetics background

The system architecture comprises a Python based FastAPI backend providing RESTful services and WebSocket support, coupled with a React frontend offering interactive visualization and real time updates. The genetic engine implements classical methods including Punnett squares and allele probability models while incorporating modern genomic analysis techniques such as Genomic Relationship Matrix computation and inbreeding coefficient estimation.

The dual mode design serves distinct use cases. Simulation Mode enables exploratory learning through virtual breeding experiments with randomly generated populations. Real Data Mode demonstrates practical applications by predicting cross outcomes between authentic inbred mouse strains using curated gene models derived from the Mouse Phenome Database.

---

## II. Methodology

### A. Data Preparation

Two main data sources were used:

- Phenotype value sets from the initial prototype.
- JSON based structured gene models and tables derived from MPD for the extended system.

Preprocessing steps included:

- Normalizing trait names.
- Encoding alleles into uniform genotype pairs using A and a notation.
- Removing incomplete or inconsistent records.
- Constructing explicit genotype phenotype rules.

### B. Genetic Inheritance Model

#### 1) Allele Pairing:

For each trait, offspring allele probability is computed as:  
P(offspring allele) = P(parent A allele) × P(parent B allele)  
All allele combinations AA, Aa, aA, and aa are evaluated.

#### 2) Dominance Resolution:

Given a genotype G:

- If G contains a dominant allele, the dominant phenotype is expressed.
- Otherwise, the recessive phenotype is expressed.

#### 3) Probabilistic Punnett Expansion:

For heterozygous cases:  
P(dominant expression) = 1 − P(recessive)

#### 4) Multi Trait Handling:

Each trait is processed independently and combined into a composite offspring profile.

### C. Software Architecture

The system implements a three tier architecture separating presentation, business logic, and data persistence:

#### 1) Backend Layer:

The FastAPI framework provides the REST API with automatic OpenAPI documentation generation. The application structure follows:

- Main application module defining 24 endpoint routes organized by functional category
- Pydantic schemas for request validation and response serialization
- Service layer implementing genetics operations and business logic
- SQLAlchemy ORM models for database persistence
- WebSocket endpoint manager for real time communication

Core genetics operations are encapsulated in a GeneticsService class maintaining in memory population state with SQLite persistence. The service layer interfaces with the mouse breeder module implementing low level genetic operations.

#### 2) Frontend Layer:

The React application uses functional components with hooks for state management. Key components include:

- SinglePage: Main application container managing mode switching and global state
- PopulationList: Grid display of mouse cards with breeding controls
- MouseCard: Individual mouse visualization showing ID, generation, and phenotype
- GeneticsPanel: Analysis results display with GRM heatmap and inbreeding coefficients
- useBreedingSocket: Custom hook managing WebSocket connection lifecycle

The interface employs CSS Grid for responsive four column layout with independently scrollable sections. All styling uses inline styles for component encapsulation without external CSS frameworks.

#### 3) Data Layer:

SQLite provides lightweight persistent storage without requiring separate database server installation. The schema includes:

- Mouse table: Individual mouse records with genotype and phenotype data
- Population table: Population metadata and configuration
- Pedigree relationships: Parent offspring linkages for inbreeding calculation

The Mouse Phenome Database integration uses JSON configuration files mapping strain names to genotype data for multiple genes. Gene models specify allele variants, dominance relationships, and phenotype mappings.

### D. Evaluation Metrics

The validation framework tests biological accuracy through five independent test suites:

#### 1) Mendelian Ratio Validation:

Chi square goodness of fit tests verify that F2 crosses produce expected phenotypic ratios. For a simple dominant recessive trait, the test confirms 3:1 ratios within statistical significance thresholds (p greater than 0.05).

#### 2) GRM Accuracy Testing:

Relationship coefficients are validated against theoretical expectations:

- Parent offspring pairs should yield approximately 0.5
- Full siblings should yield approximately 0.5
- Unrelated individuals should yield approximately 0
- Self relationships should yield 1.0

#### 3) Inbreeding Coefficient Correlation:

Pedigree based inbreeding coefficients are compared with genomic estimates derived from GRM diagonal elements. Strong positive correlation (r greater than 0.8) indicates consistency between methods.

#### 4) Heritability Estimation:

Realized heritability is computed from parent offspring regression. Values must fall within the biologically plausible range of 0 to 1, with typical traits showing heritability between 0.2 and 0.8.

#### 5) Real Mode Prediction Accuracy:

Cross predictions using Mouse Phenome Database strains are validated against known inheritance patterns documented in genetics literature. Genotype distributions must match expected Mendelian segregation patterns.

#### 6) Performance Benchmarking:

Response time measurements ensure acceptable user experience:

- Population creation: Target under 1 second for 100 mice
- Breeding operations: Target under 200 milliseconds per cross
- GRM computation: Target under 5 seconds for 50 mice
- WebSocket latency: Target under 100 milliseconds

All validation tests are implemented as automated endpoint tests accessible via the validation API routes.

---

## III. Results

### A. System Implementation

The final system comprises a full stack web application with comprehensive genetic simulation capabilities:

#### 1) Backend Architecture:

A FastAPI based REST API was implemented with 24 endpoints organized into six functional categories:

- Breeding Operations: Two endpoints for direct breeding and cross prediction
- Population Management: Four endpoints for creating, retrieving, selecting, and advancing populations
- Genetics Analysis: Three endpoints for computing Genomic Relationship Matrix, inbreeding coefficients, and heritability estimation
- Validation Suite: Five endpoints for testing Mendelian ratios, GRM accuracy, inbreeding correlation, heritability estimation, and real mode predictions
- Real Data Integration: Two endpoints for listing available strains and genes from the Mouse Phenome Database
- Utility Endpoints: Eight additional endpoints for mouse details, pedigree visualization, and data export

The backend utilizes SQLite for persistent storage, Pydantic for data validation, and implements WebSocket support for real time breeding simulations at ws://localhost:8000/ws/breeding.

#### 2) Frontend Interface:

A React based single page application was developed with two operational modes:

Simulation Mode provides:

- Population creation with configurable size (10 to 100 mice)
- Individual mouse breeding with automatic partner selection
- Generation advancement with selection strategies
- Real time WebSocket connection for live breeding updates
- Genomic Relationship Matrix visualization with color coded heatmap
- Inbreeding coefficient calculation and display
- Activity logging for all breeding events

Real Data Mode provides:

- Strain selection from Mouse Phenome Database (C57BL/6J, DBA/2J, BALB/cJ, 129S1/SvImJ)
- Gene selection for trait analysis (TYRP1, MC1R, TYR, and others)
- Cross prediction with genotype and phenotype distributions
- Punnett square visualization
- Expected Mendelian ratios display

The interface employs a four column grid layout optimized for viewport utilization with independently scrollable sections. All UI elements include contextual tooltips and explanatory text to support users without genetics background.

#### 3) Genetic Analysis Features:

The Genomic Relationship Matrix implementation computes pairwise genetic relationships between all mice in a population. Values range from 0 (unrelated) to 1 (identical), with visualization using a six level color gradient from red (very high relationship, greater than or equal to 0.9) to light blue (minimal relationship, less than 0.1).

Inbreeding coefficient calculation provides both pedigree based and genomic estimates. Pedigree inbreeding traces shared ancestors through family trees, while genomic inbreeding derives from GRM diagonal elements. The system reports individual coefficients and population means for both metrics.

Heritability estimation uses realized heritability from parent offspring regression, providing quantitative measures of trait inheritance strength.

### B. Validation Results

The validation suite confirms biological accuracy across five dimensions:

- Mendelian Ratio Testing: Chi square tests verify that F2 crosses produce expected 3:1 dominant to recessive ratios within statistical tolerance
- GRM Accuracy: Relationship coefficients correctly identify parent offspring pairs (0.5), full siblings (0.5), and unrelated individuals (approximately 0)
- Inbreeding Correlation: Pedigree based and genomic inbreeding estimates show strong positive correlation
- Heritability Estimation: Realized heritability values fall within biologically plausible ranges (0 to 1)
- Real Mode Predictions: Cross predictions using Mouse Phenome Database strains produce genotype distributions matching known inheritance patterns

### C. Performance Characteristics

Population creation completes in under 1 second for populations up to 100 mice. Breeding operations execute in 50 to 200 milliseconds per cross. GRM computation scales quadratically with population size, completing in approximately 2 seconds for 50 mice. WebSocket connections maintain sub 100 millisecond latency for real time updates.

The system handles concurrent requests through FastAPI asynchronous processing. Database operations use SQLAlchemy ORM with automatic session management. All endpoints return structured JSON responses with comprehensive error handling.

### D. User Interface Enhancements

Extensive user experience improvements were implemented to support educational use:

- Contextual help text appears throughout the interface explaining genetic concepts
- Mouse strain descriptions identify key characteristics (coat color, research applications)
- Tooltips provide definitions for technical terms (generation, inbreeding, GRM)
- Color coded visualizations aid pattern recognition in genetic data
- Activity logs track all user actions with timestamps
- Responsive layout adapts to different screen sizes while maintaining readability

The interface successfully balances technical accuracy with accessibility for users without prior genetics training.

---

## IV. Discussion

### A. Biological Accuracy and Educational Value

The implemented system successfully demonstrates that complex mouse breeding processes can be accurately simulated through computational methods. The validation results confirm that the genetic inheritance model produces biologically correct outcomes across multiple dimensions including Mendelian ratios, relationship coefficients, and inbreeding estimates.

The dual mode architecture serves distinct educational purposes. Simulation Mode allows students to explore genetic principles through interactive experimentation without requiring knowledge of specific mouse strains or genes. Real Data Mode connects theoretical concepts to actual research applications by using authentic Mouse Phenome Database strains and demonstrating how geneticists predict cross outcomes in laboratory settings.

### B. Computational Efficiency

Performance characteristics indicate the system scales appropriately for educational and small research applications. Population sizes up to 100 mice process efficiently on standard hardware. The quadratic scaling of GRM computation becomes noticeable only for populations exceeding 50 individuals, which remains acceptable for typical use cases.

WebSocket integration enables real time collaboration scenarios where multiple users can observe breeding simulations simultaneously. The sub 100 millisecond latency ensures responsive interaction even during computationally intensive operations.

### C. User Interface Design Considerations

The extensive contextual help system addresses a critical challenge in genetics education: the gap between theoretical knowledge and practical application. By providing strain descriptions, gene explanations, and concept definitions directly within the interface, the system reduces cognitive load and supports self directed learning.

Color coded visualizations in the Genomic Relationship Matrix transform abstract numerical data into intuitive visual patterns. Users can quickly identify closely related individuals without interpreting raw correlation coefficients, making genetic relationships more accessible to beginners.

### D. Extensibility and Future Directions

The modular architecture supports several potential extensions. Additional mouse strains from the Mouse Phenome Database can be integrated by expanding the gene models configuration. More complex inheritance patterns such as epistasis, polygenic traits, and sex linked inheritance could be incorporated into the breeding engine.

The validation framework provides a foundation for continuous quality assurance as new features are added. Each genetic mechanism can be independently tested to ensure biological accuracy is maintained.

### E. Limitations

The current implementation simplifies several aspects of real mouse genetics. Environmental effects on phenotype expression are not modeled. Epigenetic inheritance and maternal effects are not considered. The quantitative trait model assumes additive genetic effects without dominance or epistatic interactions.

These simplifications are intentional design choices that balance biological realism with computational tractability and educational clarity. For introductory genetics education, the current model provides sufficient complexity to illustrate core principles while remaining comprehensible to students.

### F. Practical Applications

Beyond educational use, the system provides value for preliminary experimental design. Researchers can simulate breeding schemes to estimate the number of generations required to achieve desired trait combinations or to assess the risk of inbreeding depression in small populations.

The export functionality enables integration with external analysis tools. Population data can be exported in JSON or CSV formats for statistical analysis, visualization, or record keeping purposes.

---

## V. Conclusion

This project successfully demonstrates that comprehensive mouse breeding simulation can be achieved through web based computational methods while maintaining biological accuracy and educational accessibility. The implemented system integrates classical Mendelian genetics with modern genomic analysis techniques, providing both theoretical learning opportunities and practical research applications.

The validation results confirm that the genetic inheritance model produces biologically correct outcomes across multiple dimensions. Mendelian ratios, relationship coefficients, and inbreeding estimates all align with theoretical expectations and empirical observations from real mouse genetics research.

The dual mode architecture effectively serves distinct user needs. Students can explore genetic principles through interactive simulation without requiring domain specific knowledge, while researchers can leverage real Mouse Phenome Database data for preliminary experimental design. The extensive contextual help system bridges the gap between theoretical genetics education and practical application.

Performance characteristics demonstrate that the system scales appropriately for educational and small research contexts. The modular architecture supports future extensions including additional inheritance mechanisms, more complex trait models, and integration with external genomic databases.

The project establishes a foundation for computational genetics education that balances biological realism with pedagogical clarity. By reducing reliance on physical animal experimentation for educational purposes, the system contributes to ethical research practices while providing students with hands on experience in genetic analysis and breeding scheme design.

Future development directions include incorporating epistatic interactions, environmental effects on phenotype expression, and sex linked inheritance patterns. Integration with additional Mouse Phenome Database datasets would expand the range of available strains and traits. Collaborative features enabling multiple users to work on shared populations could support classroom learning scenarios.

---

## Formatting and Publication Notes

- Entire document uses Times New Roman or Times font only.
- Title font size is 24 pt.
- Author names are 11 pt.
- Affiliations are 10 pt italic.
- Email addresses are 9 pt Courier.
- All paragraphs are indented and fully justified.
- Headings use no more than three levels and follow IEEE style conventions.
- Figures and tables are centered, use solid fill colors, and meet resolution requirements.
- Figure captions are 8 pt and placed after figures.
- Table captions are 8 pt small caps and placed before tables.
- Page numbers, headers, footers, hyperlinks, and bookmarks are not used.

---

## Acknowledgment

Causal Productions is acknowledged for providing the original IEEE based template used in this document. Appreciation is also extended to Michael Shell and contributors to the IEEE LaTeX style files.

---

## References

[1] Mouse Phenome Database (MPD), The Jackson Laboratory, Bar Harbor, ME. Available: https://phenome.jax.org/

[2] D. S. Falconer and T. F. C. Mackay, _Introduction to Quantitative Genetics_, 4th ed. Harlow, England: Longman, 1996.

[3] L. B. Russell, "Definition of functional units in a small chromosomal segment of the mouse and its use in interpreting the nature of radiation-induced mutations," _Mutation Research_, vol. 11, pp. 107-123, 1971.

[4] FastAPI Framework Documentation, Version 0.104.1. Available: https://fastapi.tiangolo.com/

[5] React JavaScript Library, Version 18. Meta Platforms, Inc. Available: https://react.dev/

[6] G. R. Bink et al., "Genomic relationship matrix and inbreeding coefficient estimation in animal breeding," _Journal of Animal Science_, vol. 86, pp. 2089-2091, 2008.

[7] P. M. VanRaden, "Efficient methods to compute genomic predictions," _Journal of Dairy Science_, vol. 91, pp. 4414-4423, 2008.

[8] J. A. Woolliams et al., "Genetic contributions and their optimization," _Journal of Animal Breeding and Genetics_, vol. 132, pp. 89-99, 2015.

[9] SQLAlchemy ORM Documentation, Version 2.0. Available: https://www.sqlalchemy.org/

[10] Pydantic Data Validation Library, Version 2.0. Available: https://docs.pydantic.dev/

[11] WebSocket Protocol Specification, RFC 6455, Internet Engineering Task Force, 2011.

[12] M. F. W. Festing, "Inbred strains in biomedical research," _Laboratory Animals_, vol. 13, pp. 11-23, 1979.

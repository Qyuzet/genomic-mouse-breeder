#!/usr/bin/env python3
"""
Mouse Phenome Database (MPD) SNP Data Processor - Smart Workflow

This script intelligently processes raw MPD SNP data with the following workflow:

1. Check datasets/cleaned/ folder first
   - If cleaned data exists, use it directly

2. Check for new raw files in datasets/raw/
   - Compare raw files against cleaned files
   - Process only new/unprocessed raw files

3. Process raw data
   - Read any CSV format from datasets/raw/
   - Convert to simulator format
   - Save to datasets/cleaned/ with "cleaned_" prefix

Input format (MPD raw):
    chr, bp38, rs, observed, dbsnp142annot, requested, "C57BL/6J", "BALB/cJ", ...

Output format (simulator):
    strain, chr, pos, genotype_012

Genotype encoding:
    0 = homozygous reference (same allele in both strains)
    1 = heterozygous (different alleles between strains)
    2 = homozygous alternate (for future multi-strain support)

Directory structure:
    datasets/
        raw/          - Raw MPD CSV files (any naming format)
        cleaned/      - Processed files (cleaned_*.csv)
"""

import csv
import os
import glob
import hashlib


def get_file_hash(filepath):
    """
    Calculate MD5 hash of a file to track which raw files have been processed.

    Args:
        filepath: Path to file

    Returns:
        MD5 hash string
    """
    hash_md5 = hashlib.md5()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def find_raw_files(raw_dir='datasets/raw'):
    """
    Step 1: Find all raw CSV files in datasets/raw/ folder.

    Args:
        raw_dir: Path to raw data folder

    Returns:
        List of raw CSV file paths
    """
    # Look for any CSV file in the raw directory
    csv_files = glob.glob(os.path.join(raw_dir, '*.csv'))

    if not csv_files:
        print(f"No raw CSV files found in {raw_dir}/")
        return []

    print(f"Found {len(csv_files)} raw file(s) in {raw_dir}/:")
    for f in csv_files:
        print(f"  - {os.path.basename(f)}")

    return csv_files


def find_cleaned_files(cleaned_dir='datasets/cleaned'):
    """
    Step 2: Find all cleaned CSV files in datasets/cleaned/ folder.

    Args:
        cleaned_dir: Path to cleaned data folder

    Returns:
        List of cleaned CSV file paths
    """
    # Look for cleaned CSV files
    csv_files = glob.glob(os.path.join(cleaned_dir, 'cleaned_*.csv'))

    if csv_files:
        print(f"Found {len(csv_files)} cleaned file(s) in {cleaned_dir}/:")
        for f in csv_files:
            print(f"  - {os.path.basename(f)}")
    else:
        print(f"No cleaned files found in {cleaned_dir}/")

    return csv_files


def get_cleaned_filename(raw_filepath, cleaned_dir='datasets/cleaned'):
    """
    Generate cleaned filename from raw filename.

    Args:
        raw_filepath: Path to raw CSV file
        cleaned_dir: Path to cleaned data folder

    Returns:
        Path to cleaned CSV file
    """
    # Get base filename without path
    raw_basename = os.path.basename(raw_filepath)

    # Add "cleaned_" prefix
    cleaned_basename = f"cleaned_{raw_basename}"

    # Return full path
    return os.path.join(cleaned_dir, cleaned_basename)


def identify_new_files(raw_files, cleaned_dir='datasets/cleaned'):
    """
    Step 3: Identify which raw files need to be processed.

    Compares raw files against cleaned files to find new/unprocessed data.

    Args:
        raw_files: List of raw CSV file paths
        cleaned_dir: Path to cleaned data folder

    Returns:
        List of raw files that need processing
    """
    new_files = []

    for raw_file in raw_files:
        # Get expected cleaned filename
        cleaned_file = get_cleaned_filename(raw_file, cleaned_dir)

        # Check if cleaned version exists
        if not os.path.exists(cleaned_file):
            print(f"  ✓ {os.path.basename(raw_file)} - needs processing (no cleaned version)")
            new_files.append(raw_file)
        else:
            print(f"  ✓ {os.path.basename(raw_file)} - already processed")

    return new_files


def parse_mpd_csv(input_path):
    """
    Step 4: Parse the MPD CSV file and extract relevant columns.

    This parser is flexible and handles any MPD CSV naming format.
    It automatically detects strain columns (quoted column names).

    Args:
        input_path: Path to input CSV file

    Returns:
        Tuple of (snp_data, strain_columns)
        - snp_data: List of dicts with keys: chr, pos, strain_alleles
        - strain_columns: List of strain names found
    """
    snp_data = []

    print(f"\nParsing: {os.path.basename(input_path)}")

    with open(input_path, 'r', encoding='utf-8') as f:
        # Read header line manually to preserve quotes
        header_line = f.readline().strip()
        headers = header_line.split(',')

        # Identify strain columns (those with quotes, e.g., "C57BL/6J")
        strain_columns = []
        strain_indices = []
        for i, col in enumerate(headers):
            if col.startswith('"') and col.endswith('"'):
                strain_columns.append(col.strip('"'))
                strain_indices.append(i)

        print(f"  Detected {len(strain_columns)} strain(s): {', '.join(strain_columns)}")

        # Find indices for chr and bp38 (genomic position)
        try:
            chr_idx = headers.index('chr')
            pos_idx = headers.index('bp38')
        except ValueError as e:
            print(f"  ERROR: Required column not found: {e}")
            return [], []

        # Read data rows
        for line in f:
            line = line.strip()
            if not line:
                continue

            fields = line.split(',')

            # Extract chromosome number (convert to "chr8" format)
            chr_num = fields[chr_idx].strip()
            chr_name = f"chr{chr_num}"

            # Extract genomic position (bp38 = GRCm38/mm10 assembly)
            try:
                pos = int(fields[pos_idx])
            except (ValueError, IndexError):
                continue

            # Extract alleles for each strain
            strain_alleles = {}
            for strain_name, idx in zip(strain_columns, strain_indices):
                if idx < len(fields):
                    allele = fields[idx].strip()
                    # Skip empty alleles
                    if allele:
                        strain_alleles[strain_name] = allele

            # Only keep SNPs where we have data for at least one strain
            if strain_alleles:
                snp_data.append({
                    'chr': chr_name,
                    'pos': pos,
                    'strain_alleles': strain_alleles
                })

    print(f"  Extracted {len(snp_data)} SNP(s)")
    return snp_data, strain_columns


def convert_to_genotypes(snp_data, strain_columns):
    """
    Step 5: Convert alleles to numeric genotypes (0/1/2 encoding).

    For each SNP, we compare alleles between strains:
    - If all strains have the same allele: genotype = 0 (homozygous reference)
    - If strains differ: genotype = 1 (heterozygous) or 2 (homozygous alternate)

    This encoding allows the simulator to model Mendelian inheritance.

    Args:
        snp_data: List of SNP records from parse_mpd_csv()
        strain_columns: List of strain column names (already cleaned)

    Returns:
        List of dicts with keys: strain, chr, pos, genotype_012
    """
    genotype_records = []

    print(f"\nConverting alleles to genotypes...")

    # Strain names are already cleaned (no quotes)
    strain_names = strain_columns
    
    for snp in snp_data:
        chr_name = snp['chr']
        pos = snp['pos']
        strain_alleles = snp['strain_alleles']
        
        # Get all unique alleles at this position
        all_alleles = list(strain_alleles.values())
        unique_alleles = list(set(all_alleles))
        
        # Determine reference allele (most common, or first alphabetically)
        if len(unique_alleles) == 1:
            # All strains have same allele
            ref_allele = unique_alleles[0]
            alt_allele = None
        else:
            # Multiple alleles present
            # Sort alphabetically to get consistent reference
            unique_alleles.sort()
            ref_allele = unique_alleles[0]
            alt_allele = unique_alleles[1] if len(unique_alleles) > 1 else None
        
        # Convert each strain's allele to 0/1/2 genotype
        for strain_name in strain_names:
            if strain_name not in strain_alleles:
                # Missing data - skip this strain for this SNP
                continue
            
            allele = strain_alleles[strain_name]
            
            # Encode genotype:
            # 0 = homozygous reference (ref/ref)
            # 1 = heterozygous (ref/alt) - not applicable for inbred strains
            # 2 = homozygous alternate (alt/alt)
            if allele == ref_allele:
                genotype = 0
            elif allele == alt_allele:
                genotype = 2
            else:
                # Shouldn't happen with biallelic SNPs, but handle gracefully
                genotype = 1
            
            genotype_records.append({
                'strain': strain_name,
                'chr': chr_name,
                'pos': pos,
                'genotype_012': genotype
            })

    print(f"  Generated {len(genotype_records)} genotype record(s)")
    return genotype_records


def save_cleaned_genotypes(genotype_records, output_path):
    """
    Step 6: Save cleaned genotype data to CSV.

    Output format matches simulator requirements:
        strain, chr, pos, genotype_012

    Args:
        genotype_records: List of genotype dicts
        output_path: Path to output CSV file
    """
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['strain', 'chr', 'pos', 'genotype_012']
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        writer.writeheader()
        for record in genotype_records:
            writer.writerow(record)

    print(f"\n✓ Saved {len(genotype_records)} record(s) to: {output_path}")


def process_file(raw_file, cleaned_dir='datasets/cleaned'):
    """
    Process a single raw file: parse, convert, and save.

    Args:
        raw_file: Path to raw CSV file
        cleaned_dir: Path to cleaned data folder

    Returns:
        Path to cleaned file, or None if processing failed
    """
    # Step 4: Parse CSV
    snp_data, strain_columns = parse_mpd_csv(raw_file)

    if not snp_data:
        print(f"  ERROR: No data extracted from {os.path.basename(raw_file)}")
        return None

    # Step 5: Convert to genotypes
    genotype_records = convert_to_genotypes(snp_data, strain_columns)

    # Step 6: Save output
    output_path = get_cleaned_filename(raw_file, cleaned_dir)
    save_cleaned_genotypes(genotype_records, output_path)

    return output_path


def get_all_cleaned_data(cleaned_dir='datasets/cleaned'):
    """
    Combine all cleaned CSV files into a single dataset.

    Args:
        cleaned_dir: Path to cleaned data folder

    Returns:
        Path to combined cleaned file, or None if no cleaned files exist
    """
    cleaned_files = find_cleaned_files(cleaned_dir)

    if not cleaned_files:
        return None

    # If only one file, return it directly
    if len(cleaned_files) == 1:
        return cleaned_files[0]

    # If multiple files, combine them
    print(f"\nCombining {len(cleaned_files)} cleaned file(s)...")

    all_records = []
    for cleaned_file in cleaned_files:
        with open(cleaned_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            all_records.extend(list(reader))

    # Save combined file
    combined_path = os.path.join(cleaned_dir, 'combined_all_strains.csv')
    with open(combined_path, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['strain', 'chr', 'pos', 'genotype_012']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_records)

    print(f"✓ Combined {len(all_records)} record(s) to: {combined_path}")
    return combined_path


def main():
    """
    Smart processing pipeline:

    1. Check datasets/cleaned/ folder first
       - If cleaned data exists, report it

    2. Check for new raw files in datasets/raw/
       - Compare against cleaned files
       - Process only new/unprocessed files

    3. Process new raw files
       - Parse MPD CSV format
       - Convert alleles to genotypes (0/1/2)
       - Save to datasets/cleaned/ with "cleaned_" prefix

    4. Report final cleaned data location
    """
    print("=" * 80)
    print("Mouse Phenome Database SNP Data Processor - Smart Workflow")
    print("=" * 80)
    print()

    raw_dir = 'datasets/raw'
    cleaned_dir = 'datasets/cleaned'

    # Ensure directories exist
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(cleaned_dir, exist_ok=True)

    # Step 1: Find raw files
    raw_files = find_raw_files(raw_dir)

    if not raw_files:
        print(f"\nERROR: No raw CSV files found in {raw_dir}/")
        print(f"Please add MPD CSV files to {raw_dir}/ folder")
        return

    print()

    # Step 2: Find existing cleaned files
    existing_cleaned = find_cleaned_files(cleaned_dir)

    print()

    # Step 3: Identify new files that need processing
    print("Checking for new files to process...")
    new_files = identify_new_files(raw_files, cleaned_dir)

    # Step 4-6: Process new files
    if new_files:
        print(f"\nProcessing {len(new_files)} new file(s)...")
        for raw_file in new_files:
            process_file(raw_file, cleaned_dir)
    else:
        print("\n✓ All raw files have been processed!")

    # Get final cleaned data location
    print()
    print("=" * 80)
    print("Processing Complete!")
    print("=" * 80)

    # Find all cleaned files
    all_cleaned = find_cleaned_files(cleaned_dir)

    if all_cleaned:
        print(f"\nCleaned data available in: {cleaned_dir}/")
        for f in all_cleaned:
            print(f"  - {os.path.basename(f)}")

        # Use the first cleaned file for the example command
        example_file = all_cleaned[0]

        print()
        print("Next steps:")
        print("1. Run the simulator with REAL mode:")
        print(f"   python mouse-breeder.py --mode real \\")
        print(f"     --genotypes {example_file} \\")
        print(f"     --strainA C57BL/6J --strainB BALB/cJ")
    else:
        print("\nNo cleaned data available.")

    print()


if __name__ == '__main__':
    main()


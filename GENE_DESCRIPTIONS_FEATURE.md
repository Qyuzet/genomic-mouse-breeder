# Gene Descriptions Feature

## Problem

The gene dropdown in the Real Data tab showed only gene codes (MC1R, TYRP1, TYR, ASIP, KIT, MTTP, LEP) without any explanation of what each gene does or what trait it affects. This was confusing for users, especially beginners who don't know mouse genetics.

## Solution

Added comprehensive gene descriptions that display:

1. **In the dropdown options**: Gene code, full name, and trait affected
2. **Below the dropdown**: Detailed information box when a gene is selected

## Implementation

### Frontend Changes

**File: `client/src/components/SinglePage.jsx`**

**Added state for gene details:**
```javascript
const [geneDetails, setGeneDetails] = useState({});
```

**Updated API call to fetch gene details:**
```javascript
api.getGenes().then((r) => {
  setGenes(r.genes || []);
  setGeneDetails(r.details || {});
})
```

**Enhanced dropdown with descriptions:**
```javascript
<option key={g} value={g} title={func}>
  {g} - {name} ({trait})
</option>
```

**Added information box below dropdown:**
```javascript
{gene && geneDetails[gene] && (
  <div style={{ /* blue info box styling */ }}>
    <div>{geneDetails[gene].name}</div>
    <div>{geneDetails[gene].function}</div>
    <div>Trait: {geneDetails[gene].trait} | Model: {geneDetails[gene].model?.type}</div>
  </div>
)}
```

## Gene Information Available

### Coat Color Genes

**MC1R** - Melanocortin 1 receptor (coat_color)
- Function: Switches between eumelanin (black/brown) and pheomelanin (yellow/red)
- Model: Recessive
- Phenotypes: black → yellow

**TYRP1** - Tyrosinase related protein 1 (coat_color)
- Function: Eumelanin maturation; LoF causes brown dilution
- Model: Recessive
- Phenotypes: black → brown

**TYR** - Tyrosinase (coat_color)
- Function: Essential enzyme for melanin production (all pigment)
- Model: Recessive
- Phenotypes: black → albino/white

**ASIP** - Agouti signaling protein (coat_color)
- Function: Controls banding pattern on individual hairs (agouti pattern)
- Model: Dominant
- Phenotypes: black → agouti (banded/tan)

**KIT** - KIT proto-oncogene (coat_color)
- Function: Controls melanocyte migration and survival (white spotting)
- Model: Dominant
- Phenotypes: solid → spotted → white

### Body Weight Genes

**MTTP** - Microsomal triglyceride transfer protein (body_weight)
- Function: Lipid metabolism and body weight regulation
- Model: Additive
- Phenotypes: normal → intermediate → high weight

**LEP** - Leptin (body_weight)
- Function: Appetite regulation and energy balance
- Model: Recessive
- Phenotypes: normal → obese (ob/ob mice)

## User Experience Improvements

### Before:
- Dropdown showed: "MC1R", "TYRP1", "TYR", etc.
- No explanation of what each gene does
- Users had to guess or look up information externally

### After:
- Dropdown shows: "MC1R - Melanocortin 1 receptor (coat_color)"
- Hover tooltip shows full function description
- Information box appears below dropdown with:
  - Full gene name
  - Biological function
  - Trait affected
  - Genetic model type (dominant/recessive/additive)

## Benefits

1. **Educational**: Users learn about mouse genetics while using the tool
2. **Professional**: Shows scientific accuracy and attention to detail
3. **User-friendly**: No need to look up gene information externally
4. **Lab-grade**: Suitable for both teaching and research environments
5. **Accessible**: Beginners can understand what they're selecting

## Data Source

All gene information comes from `gene_models.json` which contains:
- Gene names and symbols
- Biological functions
- Trait associations
- Genetic models (dominant/recessive/additive)
- Genotype-phenotype mappings

This data is based on real mouse genetics research and the Mouse Genome Database (MGD).

## Files Modified

1. `client/src/components/SinglePage.jsx`
   - Added `geneDetails` state
   - Updated `useEffect` to fetch gene details
   - Enhanced dropdown with descriptions
   - Added information box component

## Testing Checklist

- [ ] Gene dropdown displays full descriptions
- [ ] Information box appears when gene is selected
- [ ] Information box shows correct gene name, function, trait, and model
- [ ] Hover tooltips work on dropdown options
- [ ] All 7 genes (MC1R, TYRP1, TYR, ASIP, KIT, MTTP, LEP) display correctly
- [ ] DEFAULT option is separated and labeled clearly


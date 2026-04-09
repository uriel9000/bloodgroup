/**
 * Blood Group Predictor - Genetics Engine
 * Handles Mendelian inheritance for ABO and Rh factor.
 */

const GENETICS = {
  // Phenotype to possible Genotypes
  ABO_MAP: {
    A: ["AA", "AO"],
    B: ["BB", "BO"],
    AB: ["AB"],
    O: ["OO"],
  },
  RH_MAP: {
    "+": ["++", "+-"],
    "-": ["--"],
  },

  /**
   * Calculates probabilities for child blood groups.
   * @param {string} p1 ABO phenotype (e.g., 'A', 'B', 'AB', 'O')
   * @param {string} rh1 Rh factor ('+', '-')
   * @param {string} p2 ABO phenotype
   * @param {string} rh2 Rh factor
   * @returns {Object} { bloodGroup: probability, ... }
   */
  calculate: function (p1, rh1, p2, rh2) {
    const g1_abo = this.ABO_MAP[p1];
    const g1_rh = this.RH_MAP[rh1];
    const g2_abo = this.ABO_MAP[p2];
    const g2_rh = this.RH_MAP[rh2];

    let totalOutcomes = {};
    let totalCount = 0;

    // Perform cross for all genotype combinations
    for (let g1a of g1_abo) {
      for (let g1r of g1_rh) {
        for (let g2a of g2_abo) {
          for (let g2r of g2_rh) {
            const aboOutcomes = this.cross(g1a, g2a);
            const rhOutcomes = this.cross(g1r, g2r);

            for (let ao of aboOutcomes) {
              for (let ro of rhOutcomes) {
                const result = this.genotypeToPhenotype(ao, ro);
                totalOutcomes[result] = (totalOutcomes[result] || 0) + 1;
                totalCount++;
              }
            }
          }
        }
      }
    }

    // Convert to percentages
    let probabilities = [];
    for (let group in totalOutcomes) {
      probabilities.push({
        group: group,
        probability: parseFloat(
          ((totalOutcomes[group] / totalCount) * 100).toFixed(2),
        ),
      });
    }

    // Sort by probability descending
    return probabilities.sort((a, b) => b.probability - a.probability);
  },

  /**
   * Performs a Punnett Square cross between two genotypes.
   * @param {string} g1 Genotype 1 (e.g., 'AO')
   * @param {string} g2 Genotype 2 (e.g., 'BO')
   * @returns {string[]} Array of 4 offspring genotypes
   */
  cross: function (g1, g2) {
    let outcomes = [];
    for (let a1 of g1) {
      for (let a2 of g2) {
        // Canonical ordering (A > B > O, + > -)
        let alleles = [a1, a2].sort().join("");
        // Special case for AB
        if (alleles === "BA") alleles = "AB";
        outcomes.push(alleles);
      }
    }
    return outcomes;
  },

  /**
   * Converts a full genotype to its phenotype group.
   * @param {string} aboGenotype (e.g., 'AO')
   * @param {string} rhGenotype (e.g., '+-')
   * @returns {string} Phenotype (e.g., 'A+')
   */
  genotypeToPhenotype: function (aboGenotype, rhGenotype) {
    let abo;
    if (aboGenotype.includes("A") && aboGenotype.includes("B")) abo = "AB";
    else if (aboGenotype.includes("A")) abo = "A";
    else if (aboGenotype.includes("B")) abo = "B";
    else abo = "O";

    let rh = rhGenotype.includes("+") ? "+" : "-";
    return abo + rh;
  },

  /**
   * Metadata about blood groups for UI
   */
  getDetails: function (group) {
    const details = {
      "O-": {
        pros: "Universal red blood cell donor.",
        cons: "Can only receive O- blood.",
        notes: "Very rare and highly in demand.",
      },
      "O+": {
        pros: "Can give to any positive blood type.",
        cons: "Can only receive O+ or O-.",
        notes: "The most common blood type.",
      },
      "A-": {
        pros: "Can give to A-, A+, AB-, AB+.",
        cons: "Can only receive A- or O-.",
        notes: "Important for plasma donations.",
      },
      "A+": {
        pros: "Can give to A+ and AB+.",
        cons: "Can only receive A+, A-, O+, O-.",
        notes: "Second most common blood type.",
      },
      "B-": {
        pros: "Can give to B-, B+, AB-, AB+.",
        cons: "Can only receive B- or O-.",
        notes: "Relatively rare blood type.",
      },
      "B+": {
        pros: "Can give to B+ and AB+.",
        cons: "Can only receive B+, B-, O+, O-.",
        notes: "Common in certain populations.",
      },
      "AB-": {
        pros: "Universal plasma donor.",
        cons: "Can only give to AB- and AB+.",
        notes: "The rarest blood type.",
      },
      "AB+": {
        pros: "Universal recipient for red blood cells.",
        cons: "Can only give to AB+.",
        notes: "Very flexible for receiving blood.",
      },
    };
    return details[group] || { pros: "", cons: "", notes: "" };
  },
};

// Export for Node/PHP environment testing if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = GENETICS;
}

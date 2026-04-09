<?php
/**
 * Blood Group Predictor V3 - Clinical Genetic Analysis Engine
 * Uses unweighted Punnett probability to calculate ABO & Rh combinations.
 */
class GeneticEngine {
    
    // ABO Genotype Definitions
    private $aboGenotypes = [
        'A'  => ['AA', 'AO'],
        'B'  => ['BB', 'BO'],
        'AB' => ['AB'],
        'O'  => ['OO']
    ];

    // Rh factor Genotype Definitions
    private $rhGenotypes = [
        '+' => ['++', '+-'],
        '-' => ['--']
    ];

    public function analyze($parent1, $parent2) {
        $p1Abo = preg_replace('/[^ABO]/', '', $parent1);
        $p1Rh = strpos($parent1, '+') !== false ? '+' : '-';
        
        $p2Abo = preg_replace('/[^ABO]/', '', $parent2);
        $p2Rh = strpos($parent2, '+') !== false ? '+' : '-';

        // Validate
        if (!isset($this->aboGenotypes[$p1Abo]) || !isset($this->aboGenotypes[$p2Abo])) {
            throw new Exception("Invalid ABO alleles detected.");
        }

        // 1. ABO Inheritance (Punnett)
        $aboResults = $this->calculateTrait($this->aboGenotypes[$p1Abo], $this->aboGenotypes[$p2Abo], 'ABO');
        
        // 2. Rh Inheritance (Punnett)
        $rhResults = $this->calculateTrait($this->rhGenotypes[$p1Rh], $this->rhGenotypes[$p2Rh], 'Rh');

        // 3. Combined Phenotypes
        $combinedPhenotypes = [];
        foreach ($aboResults['phenotypes'] as $aboPhenotype => $aboProb) {
            foreach ($rhResults['phenotypes'] as $rhPhenotype => $rhProb) {
                $phenotype = $aboPhenotype . $rhPhenotype;
                $prob = ($aboProb / 100) * ($rhProb / 100) * 100;
                if ($prob > 0) {
                    $combinedPhenotypes[$phenotype] = round($prob, 2);
                }
            }
        }
        
        // Sort descending
        arsort($combinedPhenotypes);

        // 4. Clinical Rh Risk Evaluation
        $rhRisk = false;
        $riskMessage = "Safe. No Rh incompatibility detected.";
        $riskLevel = "safe"; // safe, monitor, risk

        if (array_key_exists('+', $rhResults['phenotypes']) && $rhResults['phenotypes']['+'] > 0) {
            if (($p1Rh === '-' && $p2Rh === '+') || ($p1Rh === '+' && $p2Rh === '-')) {
                $rhRisk = true;
                $riskLevel = "risk";
                $riskMessage = "WARNING: If the mother is Rh- and the father is Rh+, there is a significant risk of Rh incompatibility. Medical consultation is advised during pregnancy.";
            } elseif ($p1Rh === '-' && $p2Rh === '-') {
                // Technically impossible for child to be Rh+, but caught by math above.
            }
        }

        // 5. Structure Final Clinical Response
        return [
            "parents" => [
                "parent_1" => $parent1,
                "parent_2" => $parent2
            ],
            "genotype_breakdown" => [
                "abo" => $aboResults['genotypes'],
                "rh" => $rhResults['genotypes']
            ],
            "phenotype_probabilities" => $combinedPhenotypes,
            "clinical_markers" => [
                "rh_incompatibility_risk" => $rhRisk,
                "risk_level" => $riskLevel,
                "risk_message" => $riskMessage
            ],
            "disclaimer" => "This system provides educational genetic insights and does NOT replace professional medical diagnosis or advice."
        ];
    }

    private function calculateTrait($p1Pool, $p2Pool, $type) {
        $possibleGenotypes = [];
        $totalCombinations = 0;

        foreach ($p1Pool as $g1) {
            foreach ($p2Pool as $g2) {
                $alleles1 = str_split($g1);
                $alleles2 = str_split($g2);
                
                foreach ($alleles1 as $a1) {
                    foreach ($alleles2 as $a2) {
                        $combo = [$a1, $a2];
                        if ($type === 'ABO') {
                            sort($combo);
                            if ($combo == ['A', 'A']) $str = 'AA';
                            elseif ($combo == ['A', 'B']) $str = 'AB';
                            elseif ($combo == ['A', 'O']) $str = 'AO';
                            elseif ($combo == ['B', 'B']) $str = 'BB';
                            elseif ($combo == ['B', 'O']) $str = 'BO';
                            else $str = 'OO';
                        } else {
                            rsort($combo); // '+' before '-'
                            $str = implode('', $combo);
                        }
                        
                        if (!isset($possibleGenotypes[$str])) $possibleGenotypes[$str] = 0;
                        $possibleGenotypes[$str]++;
                        $totalCombinations++;
                    }
                }
            }
        }

        $genotypeProbabilities = [];
        $phenotypeProbabilities = [];

        foreach ($possibleGenotypes as $g => $count) {
            $prob = ($count / $totalCombinations) * 100;
            $genotypeProbabilities[$g] = round($prob, 2);
            
            $phenotype = $this->getPhenotype($g, $type);
            if (!isset($phenotypeProbabilities[$phenotype])) $phenotypeProbabilities[$phenotype] = 0;
            $phenotypeProbabilities[$phenotype] += $prob;
        }

        return [
            'genotypes' => $genotypeProbabilities,
            'phenotypes' => $phenotypeProbabilities
        ];
    }

    private function getPhenotype($genotype, $type) {
        if ($type === 'ABO') {
            if (in_array($genotype, ['AA', 'AO'])) return 'A';
            if (in_array($genotype, ['BB', 'BO'])) return 'B';
            if ($genotype === 'AB') return 'AB';
            if ($genotype === 'OO') return 'O';
        } else {
            if (in_array($genotype, ['++', '+-', '-+'])) return '+';
            if ($genotype === '--') return '-';
        }
        return 'Unknown';
    }
}

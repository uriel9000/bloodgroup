/**
 * Blood Group Predictor - Clinical Compatibility Engine
 * Handles transfusion rules and Rh incompatibility risks.
 */

const CLINICAL = {
    /**
     * Checks if a donor can safely give red blood cells to a recipient.
     * @param {string} donorGroup (e.g., 'A+')
     * @param {string} recipientGroup (e.g., 'AB+')
     * @returns {Object} { compatible: boolean, reason: string }
     */
    checkTransfusion: function(donorGroup, recipientGroup) {
        const d_abo = donorGroup.replace(/[+-]/, '');
        const d_rh = donorGroup.slice(-1);
        const r_abo = recipientGroup.replace(/[+-]/, '');
        const r_rh = recipientGroup.slice(-1);

        let aboCompatible = false;
        let rhCompatible = false;

        // ABO Compatibility
        if (d_abo === 'O') {
            aboCompatible = true; // O is universal donor for RBC
        } else if (d_abo === 'A') {
            aboCompatible = (r_abo === 'A' || r_abo === 'AB');
        } else if (d_abo === 'B') {
            aboCompatible = (r_abo === 'B' || r_abo === 'AB');
        } else if (d_abo === 'AB') {
            aboCompatible = (r_abo === 'AB');
        }

        // Rh Compatibility
        // Rh- can give to Rh+ and Rh-
        // Rh+ can only give to Rh+
        if (d_rh === '-') {
            rhCompatible = true;
        } else {
            rhCompatible = (r_rh === '+');
        }

        if (aboCompatible && rhCompatible) {
            return {
                compatible: true,
                status: 'Compatible',
                level: 'Safe',
                explanation: `Safe transfusion. ${donorGroup} is a compatible donor for ${recipientGroup}.`
            };
        } else {
            let reason = '';
            if (!aboCompatible && !rhCompatible) reason = 'Both ABO and Rh factors are incompatible.';
            else if (!aboCompatible) reason = `ABO mismatch: ${d_abo} cannot give to ${r_abo}.`;
            else reason = `Rh mismatch: ${d_rh} factor cannot give to ${r_rh} factor.`;

            return {
                compatible: false,
                status: 'Incompatible',
                level: 'Danger',
                explanation: `High Risk! ${reason} Transfusion could cause a severe hemolytic reaction.`
            };
        }
    },

    /**
     * Checks for Rh incompatibility risk during pregnancy.
     * @param {string} motherGroup (e.g., 'A-')
     * @param {string} fatherGroup (e.g., 'B+')
     * @returns {Object} { status: string, level: string, message: string }
     */
    checkPregnancyRisk: function(motherGroup, fatherGroup) {
        const m_rh = motherGroup.slice(-1);
        const f_rh = fatherGroup.slice(-1);

        if (m_rh === '-' && f_rh === '+') {
            return {
                status: 'Risk Detected',
                level: 'Warning',
                message: 'Rh Incompatibility Risk. The mother is Rh-negative and the father is Rh-positive. This may require RhoGAM treatment to prevent sensitization if the fetus is Rh-positive.',
                risk: true
            };
        } else {
            return {
                status: 'Low Risk',
                level: 'Safe',
                message: 'No Rh incompatibility risk detected for this combination.',
                risk: false
            };
        }
    },

    /**
     * General compatibility summary for Person A and Person B.
     */
    analyze: function(p1, p2) {
        const transfusion = this.checkTransfusion(p1, p2);
        const reverseTransfusion = this.checkTransfusion(p2, p1);
        const pregnancy = this.checkPregnancyRisk(p1, p2); // Assuming P1 is mother

        return {
            p1, p2,
            transfusion,
            reverseTransfusion,
            pregnancy
        };
    }
};

// Export for usage
window.CLINICAL = CLINICAL;

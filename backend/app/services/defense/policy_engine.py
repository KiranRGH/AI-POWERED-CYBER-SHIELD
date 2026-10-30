class DefensePolicyEngine:
    def evaluate_threat(self, threat):
        return {"action": "BLOCK_IP", "confidence": threat.get('confidence_score', 0)}

    def propose_action(self, threat, policy):
        return {"proposed": policy}
        
    def execute_action(self, proposal):
        print(f"Executing defense action: {proposal}")
        return True

class SimulatedFirewallAdapter:
    def block_ip(self, ip: str):
        print(f"SIMULATED: Blocking IP {ip}")

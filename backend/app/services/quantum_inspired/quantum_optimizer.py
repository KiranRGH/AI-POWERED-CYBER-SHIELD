"""
Quantum-Inspired Optimization Module
=====================================
⚠️  IMPORTANT DISCLAIMER ⚠️
This module implements CLASSICAL algorithms INSPIRED BY quantum computing concepts.
It does NOT perform actual quantum computation.
All execution runs on conventional CPUs using classical mathematical methods.

Algorithms implemented:
  - Simulated Annealing (inspired by quantum tunneling)
  - QUBO (Quadratic Unconstrained Binary Optimization) formulation
  - Quantum-inspired feature selection
  - Risk score optimization using annealing

These methods demonstrate quantum-inspired research concepts for academic purposes.
They are compared against classical baselines for honest evaluation.
"""

import numpy as np
import time
import logging
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class OptimizationResult:
    """Result of a quantum-inspired optimization run."""
    algorithm: str
    execution_mode: str = "classical_simulation"  # Always classical
    selected_features: List[int] = field(default_factory=list)
    objective_value: float = 0.0
    execution_time_seconds: float = 0.0
    iterations: int = 0
    convergence_history: List[float] = field(default_factory=list)
    classical_baseline_value: Optional[float] = None
    improvement_over_baseline: Optional[float] = None
    disclaimer: str = (
        "This is a classical simulation of quantum-inspired algorithms. "
        "No actual quantum computation was performed."
    )


class SimulatedAnnealing:
    """
    Simulated Annealing optimizer.
    
    Inspired by quantum tunneling: allows accepting worse solutions
    with a probability that decreases as 'temperature' cools.
    This helps escape local optima similar to how quantum tunneling
    theoretically allows quantum systems to pass through barriers.
    
    CLASSIFICATION: Classical algorithm — quantum-inspired concept.
    """

    def __init__(
        self,
        initial_temperature: float = 100.0,
        cooling_rate: float = 0.95,
        min_temperature: float = 0.01,
        max_iterations: int = 1000,
    ):
        self.initial_temperature = initial_temperature
        self.cooling_rate = cooling_rate
        self.min_temperature = min_temperature
        self.max_iterations = max_iterations

    def optimize(
        self,
        objective_fn,
        initial_solution: np.ndarray,
        neighbor_fn=None,
    ) -> Tuple[np.ndarray, List[float]]:
        """
        Run simulated annealing optimization.
        
        Args:
            objective_fn: Function to minimize (lower = better).
            initial_solution: Starting binary solution vector.
            neighbor_fn: Function to generate neighbor solutions.
        Returns:
            (best_solution, convergence_history)
        """
        if neighbor_fn is None:
            neighbor_fn = self._random_flip

        current = initial_solution.copy()
        best = current.copy()
        current_val = objective_fn(current)
        best_val = current_val
        temperature = self.initial_temperature
        history = [best_val]

        for i in range(self.max_iterations):
            if temperature < self.min_temperature:
                break

            neighbor = neighbor_fn(current)
            neighbor_val = objective_fn(neighbor)
            delta = neighbor_val - current_val

            # Accept better solutions always; accept worse with probability
            if delta < 0 or np.random.random() < np.exp(-delta / temperature):
                current = neighbor
                current_val = neighbor_val
                if current_val < best_val:
                    best = current.copy()
                    best_val = current_val

            temperature *= self.cooling_rate
            history.append(best_val)

        return best, history

    @staticmethod
    def _random_flip(solution: np.ndarray) -> np.ndarray:
        """Generate neighbor by flipping a random bit."""
        neighbor = solution.copy()
        idx = np.random.randint(len(solution))
        neighbor[idx] = 1 - neighbor[idx]
        return neighbor


class QuantumInspiredOptimizer:
    """
    Quantum-Inspired Optimizer for cybersecurity feature selection and risk scoring.
    
    Implements classical algorithms using quantum computing metaphors:
    - QUBO formulation for feature selection
    - Simulated annealing for optimization
    - Quantum amplitude estimation concepts (classically approximated)
    
    ⚠️  All computation is CLASSICAL. No quantum hardware is used.
    This is a research/demonstration module for academic purposes.
    """

    EXECUTION_MODE = "classical_simulation"
    ALGORITHM_FAMILY = "quantum_inspired_classical"

    def __init__(self, random_seed: int = 42):
        self.rng = np.random.default_rng(random_seed)
        self.sa = SimulatedAnnealing(
            initial_temperature=50.0,
            cooling_rate=0.92,
            min_temperature=0.001,
            max_iterations=500,
        )

    def optimize_feature_selection(
        self,
        feature_importances: np.ndarray,
        correlation_matrix: Optional[np.ndarray] = None,
        max_features: int = 10,
    ) -> OptimizationResult:
        """
        Select optimal feature subset using QUBO-like formulation + simulated annealing.
        
        QUBO formulation:
          minimize: -sum(importance_i * x_i) + lambda * sum(corr_ij * x_i * x_j)
          subject to: x_i ∈ {0,1}, sum(x_i) <= max_features
        
        This is a classical NP-hard problem solved heuristically.
        Quantum computers could theoretically solve QUBO problems faster
        using quantum annealing (e.g., D-Wave), but here we use SA classically.

        Args:
            feature_importances: Array of feature importance scores.
            correlation_matrix: Optional feature correlation matrix.
            max_features: Maximum features to select.
        Returns:
            OptimizationResult with selected feature indices.
        """
        start_time = time.time()
        n = len(feature_importances)

        # Normalize importances
        importances = feature_importances / (feature_importances.sum() + 1e-10)

        if correlation_matrix is None:
            correlation_matrix = np.eye(n)

        lambda_penalty = 0.3  # Penalty for correlated features

        def objective(x: np.ndarray) -> float:
            """QUBO objective: minimize negative importance + correlation penalty."""
            selected = np.where(x == 1)[0]
            if len(selected) == 0:
                return 1.0
            if len(selected) > max_features:
                return 100.0  # Heavy penalty for exceeding limit

            importance_term = -np.sum(importances[selected])
            corr_term = 0.0
            for i in range(len(selected)):
                for j in range(i + 1, len(selected)):
                    corr_term += lambda_penalty * abs(
                        correlation_matrix[selected[i], selected[j]]
                    )
            return importance_term + corr_term

        # Initial solution: top-k by importance
        initial = np.zeros(n, dtype=int)
        top_k = np.argsort(importances)[-max_features:]
        initial[top_k] = 1

        # Classical baseline: greedy selection
        classical_baseline = self._greedy_feature_selection(importances, max_features)
        baseline_val = objective(classical_baseline)

        # Quantum-inspired SA optimization
        best_solution, history = self.sa.optimize(objective, initial)

        # Ensure constraint
        selected = np.where(best_solution == 1)[0].tolist()
        if len(selected) > max_features:
            # Keep top by importance
            selected = sorted(selected, key=lambda i: importances[i], reverse=True)[:max_features]

        obj_val = objective(best_solution)
        elapsed = time.time() - start_time

        improvement = ((baseline_val - obj_val) / abs(baseline_val + 1e-10)) * 100 if baseline_val != 0 else 0.0

        logger.info(
            f"[quantum-inspired] feature_selection: {len(selected)}/{n} features, "
            f"time={elapsed:.3f}s, improvement={improvement:.1f}% vs baseline"
        )

        return OptimizationResult(
            algorithm="simulated_annealing_qubo",
            execution_mode=self.EXECUTION_MODE,
            selected_features=selected,
            objective_value=float(obj_val),
            execution_time_seconds=elapsed,
            iterations=len(history),
            convergence_history=[float(v) for v in history],
            classical_baseline_value=float(baseline_val),
            improvement_over_baseline=float(improvement),
        )

    def optimize_security_policy(
        self,
        threat_scores: List[float],
        resource_costs: List[float],
        budget: float = 1.0,
    ) -> OptimizationResult:
        """
        Optimize which threats to respond to given resource constraints.
        A classical knapsack-like problem formulated as QUBO.
        
        Args:
            threat_scores: Risk scores for each threat.
            resource_costs: Cost of responding to each threat.
            budget: Total response budget (normalized 0-1).
        Returns:
            OptimizationResult with selected threat indices to address.
        """
        start_time = time.time()
        n = len(threat_scores)
        scores = np.array(threat_scores)
        costs = np.array(resource_costs)

        # Normalize
        scores = scores / (scores.max() + 1e-10)
        costs = costs / (costs.max() + 1e-10)

        def objective(x: np.ndarray) -> float:
            selected = np.where(x == 1)[0]
            if len(selected) == 0:
                return 1.0
            total_cost = costs[selected].sum()
            if total_cost > budget:
                return 10.0 + (total_cost - budget)  # Penalty
            return -scores[selected].sum()

        initial = np.zeros(n, dtype=int)
        # Greedy init: add highest score/cost ratio until budget
        ratio = scores / (costs + 1e-10)
        order = np.argsort(ratio)[::-1]
        remaining = budget
        for idx in order:
            if costs[idx] <= remaining:
                initial[idx] = 1
                remaining -= costs[idx]

        classical_val = objective(initial)
        best, history = self.sa.optimize(objective, initial)

        selected = np.where(best == 1)[0].tolist()
        obj_val = objective(best)
        elapsed = time.time() - start_time
        improvement = ((classical_val - obj_val) / abs(classical_val + 1e-10)) * 100

        return OptimizationResult(
            algorithm="simulated_annealing_knapsack_qubo",
            execution_mode=self.EXECUTION_MODE,
            selected_features=selected,
            objective_value=float(obj_val),
            execution_time_seconds=elapsed,
            iterations=len(history),
            convergence_history=[float(v) for v in history],
            classical_baseline_value=float(classical_val),
            improvement_over_baseline=float(improvement),
        )

    def prioritize_investigations(
        self,
        threat_data: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Prioritize threat investigations using quantum-inspired risk scoring.
        Uses amplitude-estimation-inspired probability weighting.
        
        Args:
            threat_data: List of threat dicts with 'risk_score', 'severity', 'confidence'.
        Returns:
            Same list, sorted by quantum-inspired priority score, with priority added.
        """
        if not threat_data:
            return []

        for threat in threat_data:
            risk = float(threat.get("risk_score", 0.5))
            confidence = float(threat.get("confidence_score", 0.5))
            severity_map = {"CRITICAL": 1.0, "HIGH": 0.75, "MEDIUM": 0.5, "LOW": 0.25, "INFO": 0.1}
            severity = severity_map.get(str(threat.get("severity", "LOW")).upper(), 0.3)

            # Quantum-inspired: superposition-like probability combination
            # In real quantum, amplitudes interfere; here we approximate with geometric mean
            qi_score = (risk * confidence * severity) ** (1 / 3)
            # Add annealing-style perturbation to break ties
            qi_score += self.rng.uniform(0, 0.01)
            threat["quantum_priority_score"] = round(qi_score, 4)
            threat["priority_method"] = "quantum_inspired_classical"

        return sorted(threat_data, key=lambda t: t.get("quantum_priority_score", 0), reverse=True)

    def compare_with_classical(
        self,
        feature_importances: np.ndarray,
        max_features: int = 10,
    ) -> Dict[str, Any]:
        """
        Run both quantum-inspired and classical approaches and compare.
        
        Returns a comparison dict suitable for the admin UI.
        """
        # Quantum-inspired run
        qi_result = self.optimize_feature_selection(feature_importances, max_features=max_features)

        # Classical greedy baseline
        start = time.time()
        classical_selected = self._greedy_feature_selection(feature_importances, max_features).tolist()
        classical_time = time.time() - start

        return {
            "quantum_inspired": {
                "algorithm": qi_result.algorithm,
                "execution_mode": qi_result.execution_mode,
                "selected_features": qi_result.selected_features,
                "objective_value": qi_result.objective_value,
                "execution_time_seconds": qi_result.execution_time_seconds,
                "iterations": qi_result.iterations,
            },
            "classical_baseline": {
                "algorithm": "greedy_importance",
                "execution_mode": "classical",
                "selected_features": np.where(classical_selected == 1)[0].tolist() if isinstance(classical_selected, np.ndarray) else classical_selected,
                "execution_time_seconds": classical_time,
            },
            "improvement_percent": qi_result.improvement_over_baseline,
            "disclaimer": qi_result.disclaimer,
            "academic_note": (
                "Quantum-inspired algorithms use quantum computing metaphors (QUBO, annealing) "
                "but run on classical hardware. Actual quantum advantage for this problem size "
                "is not demonstrated. This module is for research and educational purposes."
            ),
        }

    @staticmethod
    def _greedy_feature_selection(importances: np.ndarray, max_features: int) -> np.ndarray:
        """Simple greedy baseline: select top-k by importance."""
        n = len(importances)
        solution = np.zeros(n, dtype=int)
        top_k = np.argsort(importances)[-max_features:]
        solution[top_k] = 1
        return solution


# Module-level singleton
quantum_optimizer = QuantumInspiredOptimizer()

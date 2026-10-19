import type { Question } from "./types";

const q = (id: string, subjectId: string, topicId: string, difficulty: Question["difficulty"], stem: string, options: string[], answer: number, explanation: string): Question =>
  ({ id, subjectId, topicId, difficulty, stem, options, answer, explanation });

/** Demo problem bank. Questions are sample content, not verified curriculum material. */
export const questions: Question[] = [
  q("Q05", "s-chem", "atomic-models", "Easy", "Which scientist proposed the planetary model with quantized orbits?", ["Dalton", "Bohr", "Thomson", "Rutherford"], 1, "Bohr added quantized electron orbits to Rutherford's nuclear model."),
  q("Q12", "s-chem", "ionic-bonding", "Easy", "Which pair is most likely to form an ionic bond?", ["C and H", "Na and Cl", "O and O", "N and H"], 1, "Sodium (metal) transfers an electron to chlorine (non-metal)."),
  q("Q18", "s-chem", "ionic-bonding", "Medium", "What is the charge on the ion formed by magnesium?", ["+1", "+2", "−1", "−2"], 1, "Mg has two valence electrons and loses both to reach a noble-gas configuration."),
  q("Q23", "s-chem", "covalent-bonding", "Medium", "How many electron pairs are shared in the double bond of O₂?", ["1", "2", "3", "4"], 1, "A double bond shares two pairs (four electrons)."),
  q("Q27", "s-chem", "lewis-structures", "Medium", "How many lone pairs are on the oxygen atom in H₂O?", ["0", "1", "2", "3"], 2, "Oxygen has six valence electrons; two form bonds, leaving two lone pairs."),
  q("Q31", "s-chem", "covalent-bonding", "Hard", "Which molecule violates the octet rule at its central atom?", ["CH₄", "NH₃", "BF₃", "H₂O"], 2, "Boron in BF₃ has only six electrons in its valence shell."),
  q("Q08", "s-math", "determinants", "Easy", "What is the determinant of [[2, 1], [3, 4]]?", ["5", "11", "8", "−5"], 0, "ad − bc = 8 − 3 = 5."),
  q("Q09", "s-math", "eigenvalues", "Medium", "Eigenvalues of A = [[2, 1], [1, 2]] are:", ["1 and 3", "2 and 2", "0 and 4", "−1 and 3"], 0, "det(A − λI) = (2−λ)² − 1 = 0 gives λ = 1, 3."),
  q("Q10", "s-math", "eigenvalues", "Hard", "If λ is an eigenvalue of A, then an eigenvalue of A² is:", ["λ", "2λ", "λ²", "λ + 2"], 2, "A²v = A(λv) = λ²v."),
  q("Q14", "s-phy", "interference", "Medium", "In Young's experiment, fringe width is proportional to:", ["d/λD", "λD/d", "λd/D", "D/λd"], 1, "β = λD/d."),
  q("Q15", "s-phy", "interference", "Easy", "Constructive interference needs a path difference equal to:", ["λ/2", "nλ", "(n+½)λ", "Zero only"], 1, "Integer multiples of the wavelength reinforce."),
  q("Q41", "s-cs", "classes-and-objects", "Easy", "What does `self` refer to inside an instance method?", ["The class", "The current instance", "The parent class", "A global"], 1, "`self` is the instance on which the method was called."),
  q("Q44", "s-cs", "classes-and-objects", "Medium", "Which method initializes a new object in Python?", ["__new__ only", "__init__", "__start__", "__create__"], 1, "`__init__` runs after the object is created to set up state."),
  q("Q46", "s-cs", "classes-and-objects", "Hard", "What does a class attribute shared by all instances get changed through?", ["self.attr = v", "ClassName.attr = v", "attr = v in method", "Neither"], 1, "Assigning through the class updates the shared attribute; self.attr creates an instance attribute."),
];

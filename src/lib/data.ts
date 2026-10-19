import type { AppState, Batch, Campus, Faculty, Holiday, LectureNotes, Persona, Role, Session, Slot, Subject, Topic } from "./types";
import { slug } from "./utils";

export const DEMO_NOW = "14:10"; // simulated clock so "active class" is deterministic
export const SEMESTER_LABEL = "Autumn 2026";

export const PERSONAS: Record<Role, Persona> = {
  admin: { name: "Neha Kapoor", title: "Program Manager", email: "neha.kapoor@mirai.demo" },
  manager: { name: "Rohan Iyer", title: "Campus Manager · Bengaluru", email: "rohan.iyer@mirai.demo", campusId: "blr" },
  faculty: { name: "Dr. Priya Nair", title: "Faculty · Chemistry", email: "priya.nair@mirai.demo", facultyId: "f1", campusId: "blr" },
  student: { name: "Aarav Mehta", title: "Student · BLR-CS-2026 A", email: "aarav.mehta@mirai.demo", batchId: "b1", campusId: "blr" },
};

export const campuses: Campus[] = [
  { id: "blr", name: "Bengaluru Campus", city: "Bengaluru", head: "Rohan Iyer", students: 142 },
  { id: "hyd", name: "Hyderabad Campus", city: "Hyderabad", head: "Sana Farooqui", students: 96 },
  { id: "pun", name: "Pune Campus", city: "Pune", head: "Vikas Joshi", students: 74 },
];
export const batches: Batch[] = [
  { id: "b1", name: "BLR-CS-2026 A", campusId: "blr", semester: "Semester 1", students: 72, startDate: "2026-08-03", endDate: "2026-12-18" },
  { id: "b2", name: "BLR-AI-2025 B", campusId: "blr", semester: "Semester 3", students: 70, startDate: "2026-08-03", endDate: "2026-12-18" },
  { id: "b3", name: "HYD-CS-2026 A", campusId: "hyd", semester: "Semester 1", students: 96, startDate: "2026-08-03", endDate: "2026-12-18" },
  { id: "b4", name: "PUN-CS-2026 A", campusId: "pun", semester: "Semester 1", students: 74, startDate: "2026-08-03", endDate: "2026-12-18" },
];
export const faculty: Faculty[] = [
  { id: "f1", name: "Dr. Priya Nair", email: "priya.nair@mirai.demo", campusId: "blr", weeklyCapacity: 12, specialty: "Chemistry" },
  { id: "f2", name: "Prof. Arjun Rao", email: "arjun.rao@mirai.demo", campusId: "blr", weeklyCapacity: 14, specialty: "Mathematics & Statistics" },
  { id: "f3", name: "Dr. Meera Krishnan", email: "meera.krishnan@mirai.demo", campusId: "blr", weeklyCapacity: 10, specialty: "Physics" },
  { id: "f4", name: "Karthik Subramanian", email: "karthik.s@mirai.demo", campusId: "blr", weeklyCapacity: 14, specialty: "Computer Science" },
  { id: "f5", name: "Ananya Bose", email: "ananya.bose@mirai.demo", campusId: "blr", weeklyCapacity: 8, specialty: "Communication" },
  { id: "f6", name: "Dr. Vikram Sethi", email: "vikram.sethi@mirai.demo", campusId: "blr", weeklyCapacity: 10, specialty: "Machine Learning" },
  { id: "f7", name: "Sunita Reddy", email: "sunita.reddy@mirai.demo", campusId: "hyd", weeklyCapacity: 12, specialty: "Mathematics" },
  { id: "f8", name: "Dr. Imran Qureshi", email: "imran.q@mirai.demo", campusId: "hyd", weeklyCapacity: 10, specialty: "Physics" },
  { id: "f9", name: "Kavya Menon", email: "kavya.menon@mirai.demo", campusId: "hyd", weeklyCapacity: 12, specialty: "Programming" },
  { id: "f10", name: "Dr. Rahul Deshpande", email: "rahul.d@mirai.demo", campusId: "pun", weeklyCapacity: 14, specialty: "Chemistry & Mathematics" },
  { id: "f11", name: "Shreya Kulkarni", email: "shreya.k@mirai.demo", campusId: "pun", weeklyCapacity: 8, specialty: "Communication" },
];
export const holidays: Holiday[] = [
  { id: "h1", date: "2026-10-20", name: "Vijayadashami", campusId: "all" },
  { id: "h2", date: "2026-11-08", name: "Diwali", campusId: "all" },
  { id: "h3", date: "2026-11-09", name: "Diwali break", campusId: "all" },
  { id: "h4", date: "2026-11-14", name: "Campus fest day", campusId: "blr" },
  { id: "h5", date: "2026-11-24", name: "Guru Nanak Jayanti", campusId: "all" },
  { id: "h6", date: "2026-12-25", name: "Christmas", campusId: "all" },
];

type UnitSpec = [string, [string, number][]];
/** Builds topics and fills progress sequentially until `covered` hours are consumed. */
function build(units: UnitSpec[], covered: number): Topic[] {
  let left = covered;
  const out: Topic[] = [];
  units.forEach(([unit, ts]) => ts.forEach(([name, h]) => {
    const used = Math.min(h, Math.max(0, left));
    left -= used;
    out.push({ id: slug(name), unit, name, plannedHours: h, pct: Math.round((used / h) * 100), examScope: true });
  }));
  return out;
}
const sl = (day: number, start: string, hours: number): Slot => ({ id: `sl-${day}-${start}`, day, start, hours });
const S = (id: string, code: string, name: string, campusId: string, batchId: string, facultyId: string, slots: Slot[], target: string, exam: string, units: UnitSpec[], covered: number): Subject =>
  ({ id, code, name, campusId, batchId, facultyId, startDate: "2026-08-03", targetDate: target, examDate: exam, slots, topics: build(units, covered) });

const chemUnits: UnitSpec[] = [
  ["Atomic Structure", [["Atomic Models", 5], ["Quantum Numbers", 5], ["Electronic Configuration", 5], ["Periodic Trends", 5]]],
  ["Chemical Bonding", [["Ionic Bonding", 4], ["Covalent Bonding", 5], ["Lewis Structures", 4], ["VSEPR Geometry", 5]]],
  ["Thermodynamics", [["Enthalpy", 4], ["Entropy", 4], ["Gibbs Free Energy", 4]]],
  ["Chemical Kinetics", [["Rate Laws", 4], ["Arrhenius Equation", 3], ["Catalysis", 3]]],
];
const mathUnits: UnitSpec[] = [
  ["Calculus", [["Limits and Continuity", 4], ["Differentiation", 5], ["Applications of Derivatives", 5], ["Integration", 6]]],
  ["Linear Algebra", [["Matrices", 5], ["Determinants", 4], ["Eigenvalues", 5], ["Vector Spaces", 5]]],
  ["Probability Basics", [["Counting Principles", 3], ["Conditional Probability", 4], ["Random Variables", 4]]],
];
const phyUnits: UnitSpec[] = [
  ["Mechanics", [["Kinematics", 4], ["Newton's Laws", 5], ["Work and Energy", 5], ["Rotational Motion", 5]]],
  ["Waves and Optics", [["Simple Harmonic Motion", 4], ["Wave Motion", 4], ["Interference", 4], ["Diffraction", 4]]],
  ["Electromagnetism", [["Electrostatics", 5], ["Magnetism", 5], ["Electromagnetic Induction", 5]]],
];
const csUnits: UnitSpec[] = [
  ["Fundamentals", [["Variables and Types", 3], ["Control Flow", 4], ["Functions", 4]]],
  ["Data Structures in Python", [["Lists and Tuples", 4], ["Dictionaries and Sets", 4], ["Strings", 3]]],
  ["Object-Oriented Python", [["Classes and Objects", 5], ["Inheritance", 4], ["Exceptions", 3], ["File I/O", 3]]],
];
const engUnits: UnitSpec[] = [
  ["Academic Writing", [["Paragraph Structure", 3], ["Essay Writing", 4], ["Technical Reports", 4]]],
  ["Spoken Communication", [["Presentations", 4], ["Group Discussion", 3], ["Interview Skills", 3]]],
];
const dsaUnits: UnitSpec[] = [
  ["Linear Structures", [["Arrays", 4], ["Linked Lists", 5], ["Stacks and Queues", 5]]],
  ["Trees and Graphs", [["Binary Trees", 6], ["Heaps", 4], ["Graph Traversal", 6]]],
  ["Algorithms", [["Sorting", 5], ["Searching", 3], ["Dynamic Programming", 6]]],
];
const statUnits: UnitSpec[] = [
  ["Probability", [["Probability Axioms", 4], ["Bayes Theorem", 4], ["Discrete Distributions", 5]]],
  ["Inference", [["Sampling", 4], ["Hypothesis Testing", 6], ["Confidence Intervals", 5], ["Regression", 6]]],
];
const mlUnits: UnitSpec[] = [
  ["Foundations", [["Supervised Learning", 4], ["Loss Functions", 4], ["Gradient Descent", 5]]],
  ["Models", [["Linear Models", 5], ["Decision Trees", 5], ["Model Evaluation", 5], ["Neural Network Basics", 6]]],
];

export const subjects: Subject[] = [
  S("s-math", "MATH-101", "Mathematics", "blr", "b1", "f2", [sl(1, "09:00", 2), sl(3, "09:00", 2), sl(5, "09:00", 1)], "2026-11-26", "2026-12-03", mathUnits, 24),
  S("s-phy", "PHY-101", "Physics", "blr", "b1", "f3", [sl(2, "11:00", 2), sl(4, "11:00", 2)], "2026-11-26", "2026-12-05", phyUnits, 27.5),
  S("s-chem", "CHEM-101", "Chemistry", "blr", "b1", "f1", [sl(1, "14:00", 2), sl(3, "10:00", 1), sl(4, "14:00", 2)], "2026-11-26", "2026-12-07", chemUnits, 22.8),
  S("s-cs", "CS-101", "Programming", "blr", "b1", "f4", [sl(2, "14:00", 2), sl(5, "14:00", 3)], "2026-11-26", "2026-12-09", csUnits, 16.5),
  S("s-eng", "ENG-101", "Communication Skills", "blr", "b1", "f5", [sl(3, "12:00", 2)], "2026-11-26", "2026-12-11", engUnits, 21),
  S("s-dsa", "CS-201", "Data Structures", "blr", "b2", "f4", [sl(1, "11:00", 2), sl(3, "14:00", 2), sl(5, "11:00", 2)], "2026-11-26", "2026-12-04", dsaUnits, 12),
  S("s-stat", "STAT-201", "Probability & Statistics", "blr", "b2", "f2", [sl(2, "09:00", 2), sl(4, "09:00", 2)], "2026-11-26", "2026-12-08", statUnits, 6),
  S("s-ml", "AI-201", "Machine Learning Basics", "blr", "b2", "f6", [sl(2, "16:00", 2), sl(4, "16:00", 2)], "2026-11-26", "2026-12-10", mlUnits, 11),
  S("s-math-h", "MATH-101", "Mathematics", "hyd", "b3", "f7", [sl(1, "10:00", 2), sl(3, "10:00", 2), sl(5, "10:00", 1)], "2026-11-26", "2026-12-03", mathUnits, 21.5),
  S("s-phy-h", "PHY-101", "Physics", "hyd", "b3", "f8", [sl(2, "10:00", 2), sl(4, "10:00", 2), sl(6, "10:00", 1)], "2026-11-26", "2026-12-05", phyUnits, 26),
  S("s-cs-h", "CS-101", "Programming", "hyd", "b3", "f9", [sl(1, "14:00", 1.5), sl(4, "14:00", 2)], "2026-11-26", "2026-12-09", csUnits, 12.5),
  S("s-chem-p", "CHEM-101", "Chemistry", "pun", "b4", "f10", [sl(1, "10:00", 2), sl(3, "10:00", 2), sl(5, "10:00", 1)], "2026-11-26", "2026-12-07", chemUnits, 37),
  S("s-math-p", "MATH-101", "Mathematics", "pun", "b4", "f10", [sl(2, "10:00", 2), sl(4, "10:00", 2), sl(6, "10:00", 1)], "2026-11-26", "2026-12-03", mathUnits, 25),
  S("s-eng-p", "ENG-101", "Communication Skills", "pun", "b4", "f11", [sl(3, "14:00", 2)], "2026-11-26", "2026-12-11", engUnits, 21),
];

const n = (k: string[], d: string[], e: string[], s: string[]): LectureNotes => ({ keyConcepts: k, detail: d, examples: e, sources: s });
const FAC = "Faculty-provided slides";
const mk = (id: string, subjectId: string, facultyId: string, date: string, status: Session["status"], hours: number, topics: [string, number][], activities: string, homework: string, summary: string, notes?: LectureNotes): Session =>
  ({ id, subjectId, facultyId, date, status, source: "seed", hours, topics: topics.map(([topicId, pct]) => ({ topicId, pct })), activities, homework, summary, notes });

export const sessions: Session[] = [
  mk("ss1", "s-chem", "f1", "2026-09-21", "verified", 2, [["atomic-models", 100]], "Timeline discussion, two numerical problems", "Read Chapter 2", "Completed atomic models from Dalton to Bohr."),
  mk("ss2", "s-chem", "f1", "2026-09-28", "verified", 2, [["electronic-configuration", 100], ["periodic-trends", 60]], "Aufbau practice, five configurations written", "Periodic table worksheet", "Finished electronic configuration; began periodic trends.",
    n(["Aufbau principle", "Hund's rule", "Pauli exclusion principle"], ["Orbitals fill from lowest to highest energy.", "Electrons occupy degenerate orbitals singly before pairing."], ["Fe: [Ar] 3d6 4s2", "Cu: [Ar] 3d10 4s1 (exception)"], [FAC, "Approved textbook: Chemistry Fundamentals, Ch. 3"])),
  mk("ss3", "s-chem", "f1", "2026-10-01", "missed", 0, [], "", "", "Session not held; faculty on leave."),
  mk("ss4", "s-chem", "f1", "2026-10-05", "pending", 2, [], "", "", "Class held but the record has not been verified."),
  mk("ss5", "s-chem", "f1", "2026-10-08", "verified", 2, [["periodic-trends", 100], ["ionic-bonding", 70]], "Trend graphs, three worked examples", "Ionic compound formation exercises", "Finished periodic trends; introduced ionic bonding.",
    n(["Ionization energy", "Electronegativity", "Ionic bond formation"], ["Ionization energy increases across a period and decreases down a group.", "Ionic bonds form through electron transfer between metals and non-metals."], ["NaCl formation", "MgO lattice discussion"], [FAC, "Approved textbook: Chemistry Fundamentals, Ch. 4"])),
  mk("ss6", "s-math", "f2", "2026-10-07", "verified", 2, [["determinants", 100]], "Cofactor expansion drills", "Problem set 6", "Completed determinants and properties."),
  mk("ss7", "s-math", "f2", "2026-10-09", "verified", 1, [["eigenvalues", 30]], "Characteristic polynomial examples", "Find eigenvalues of three 2x2 matrices", "Introduced eigenvalues and the characteristic equation.",
    n(["Characteristic equation", "Eigenvalue and eigenvector", "det(A − λI) = 0"], ["An eigenvector keeps its direction under the transformation.", "Eigenvalues are roots of the characteristic polynomial."], ["A = [[2,1],[1,2]] gives λ = 1, 3"], [FAC, "Approved textbook: Linear Algebra Essentials, Ch. 5"])),
  mk("ss8", "s-phy", "f3", "2026-10-08", "verified", 2, [["interference", 60]], "Young's double slit demonstration", "Numericals on fringe width", "Covered coherence and Young's double slit.",
    n(["Coherent sources", "Path difference", "Fringe width β = λD/d"], ["Constructive interference occurs when path difference is an integer multiple of λ."], ["Fringe width for λ = 600 nm"], [FAC, "Approved textbook: University Physics, Ch. 35"])),
  mk("ss9", "s-cs", "f4", "2026-10-09", "verified", 3, [["classes-and-objects", 50]], "Built a BankAccount class live", "Implement a Student class", "Classes, constructors and instance methods.",
    n(["Class vs object", "__init__ constructor", "Instance methods"], ["Classes bundle data and behaviour.", "self refers to the current instance."], ["BankAccount with deposit/withdraw"], [FAC, "Approved reference: Python Docs, Classes tutorial"])),
  mk("ss10", "s-stat", "f2", "2026-10-06", "missed", 0, [], "", "", "Session not held."),
  mk("ss11", "s-cs-h", "f9", "2026-10-08", "missed", 0, [], "", "", "Session not held."),
  mk("ss12", "s-stat", "f2", "2026-10-08", "pending", 2, [], "", "", "Awaiting verification."),
];

export const notifications = [
  { id: "n1", title: "Chemistry is in DANGER", body: "Buffer ratio fell below 1.00 for BLR-CS-2026 A.", time: "2h ago", read: false, roles: ["admin", "manager"] as Role[] },
  { id: "n2", title: "Missed session logged", body: "Probability & Statistics on 6 Oct was not held.", time: "1d ago", read: false, roles: ["manager", "admin"] as Role[] },
  { id: "n3", title: "Session awaiting verification", body: "Chemistry class on 5 Oct needs your confirmation.", time: "5h ago", read: false, roles: ["faculty"] as Role[] },
  { id: "n4", title: "Today's class starts at 14:00", body: "Chemistry — Chemical Bonding, Room 204.", time: "1h ago", read: false, roles: ["faculty", "student"] as Role[] },
  { id: "n5", title: "New lecture notes", body: "Physics — Interference notes were published.", time: "4d ago", read: true, roles: ["student"] as Role[] },
  { id: "n6", title: "Weekly report ready", body: "Your AI weekly academic report (demo) is available.", time: "2d ago", read: true, roles: ["manager", "admin"] as Role[] },
];

export function seedState(): AppState {
  const prof = (r: Role) => ({ name: PERSONAS[r].name, email: PERSONAS[r].email, emailAlerts: true, weeklyDigest: r === "manager" || r === "admin" });
  return {
    loggedIn: false, role: "admin", me: null,
    campuses, batches, faculty, subjects, holidays, sessions, attempts: [], notifications,
    profiles: { admin: prof("admin"), manager: prof("manager"), faculty: prof("faculty"), student: prof("student") },
  };
}

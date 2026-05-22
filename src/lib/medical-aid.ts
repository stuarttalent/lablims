import type { MedicalAidDetails } from "@/types";

export function emptyMedicalAidDetails(): MedicalAidDetails {
  return {
    society: "",
    plan: "",
    memberNumber: "",
    principalMember: "",
    principalSameAsPatient: true,
    suffix: "",
  };
}

export function hasMedicalAidDetails(d: MedicalAidDetails | undefined): boolean {
  if (!d) return false;
  return Boolean(
    d.society.trim() ||
      d.plan.trim() ||
      d.memberNumber.trim() ||
      d.principalMember.trim() ||
      d.suffix.trim(),
  );
}

export function resolvePrincipalMember(
  details: MedicalAidDetails,
  patientFullName: string,
): string {
  if (details.principalSameAsPatient) return patientFullName.trim();
  return details.principalMember.trim();
}

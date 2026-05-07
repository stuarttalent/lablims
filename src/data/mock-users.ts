import type { MockUser } from "@/types";

export const MOCK_USERS: MockUser[] = [
  {
    id: "u-super",
    email: "director@metropolitanclinlab.org",
    name: "Dr. Anesu Shumba",
    role: "super_admin",
    professionalCredential: "MD, FRCPath · Laboratory director · HPCZ R12104",
  },
  {
    id: "u-admin",
    email: "t.moyo@metropolitanclinlab.org",
    name: "Tariro Moyo",
    role: "admin",
    professionalCredential: "BMLS · Senior laboratory manager · HPCZ L8841",
  },
  {
    id: "u-scientist",
    email: "c.ndlovu@metropolitanclinlab.org",
    name: "Dr. Chipo Ndlovu",
    role: "scientist",
    professionalCredential: "PhD, MLS · Principal scientist · HPCZ S4402",
  },
  {
    id: "u-tech",
    email: "k.makoni@metropolitanclinlab.org",
    name: "Kudzai Makoni",
    role: "tech",
    professionalCredential: "BMLS · Medical laboratory technologist · HPCZ T2093",
  },
  {
    id: "u-biller",
    email: "n.gondo@metropolitanclinlab.org",
    name: "Nyasha Gondo",
    role: "biller",
    professionalCredential: "Finance officer · Patient accounts",
  },
  {
    id: "u-doctor",
    email: "b.mutasa@rehabmed.co.zw",
    name: "Dr. Brian Mutasa",
    role: "doctor",
    professionalCredential: "MBChB · Consultant physician · MPZ R7721",
  },
];

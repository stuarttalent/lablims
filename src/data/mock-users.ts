import type { MockUser } from "@/types";

export const MOCK_USERS: MockUser[] = [
  {
    id: "u-admin",
    email: "t.moyo@metropolitanclinlab.org",
    name: "Tariro Moyo",
    role: "admin",
  },
  {
    id: "u-scientist",
    email: "c.ndlovu@metropolitanclinlab.org",
    name: "Dr. Chipo Ndlovu",
    role: "scientist",
  },
  {
    id: "u-tech",
    email: "k.makoni@metropolitanclinlab.org",
    name: "Kudzai Makoni",
    role: "tech",
  },
  {
    id: "u-biller",
    email: "n.gondo@metropolitanclinlab.org",
    name: "Nyasha Gondo",
    role: "biller",
  },
  {
    id: "u-doctor",
    email: "b.mutasa@rehabmed.co.zw",
    name: "Dr. Brian Mutasa",
    role: "doctor",
  },
];

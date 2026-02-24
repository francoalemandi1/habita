export interface SerializedHouseholdNote {
  id: string;
  title: string;
  content: string | null;
  isPinned: boolean;
  createdById: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface SerializedInventoryItem {
  id: string;
  name: string;
  quantity: number | null;
  category: string | null;
  status: "HAVE" | "LOW" | "NEED";
  notes: string | null;
  createdById: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

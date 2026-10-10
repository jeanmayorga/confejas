export type AttendanceMutation = {
  ownerId: string;
  participantId: string;
  companyId: string;
  attended: boolean;
  expectedRevision: string;
  mutationId: string;
};

export type AttendanceRecord = AttendanceMutation & {
  participantName: string;
  serverUpdatedAt: string;
  // Persist the exact request before sending, so reloads retry the same operation.
  inFlight?: AttendanceMutation;
  blocked?: { message: string; revision?: string; attended?: boolean | null };
};

export type SavedAttendance = {
  attended: boolean;
  revision: string;
  updatedAt: string;
};

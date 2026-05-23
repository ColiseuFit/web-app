"use server";

export {
  upsertClassSlot,
  toggleClassSlot,
  deleteClassSlot,
  bulkUpdateClassSlots,
  bulkCreateClassSlots,
  getHolidays,
  addHoliday,
  removeHoliday
} from "./actions-class";

export {
  getSlotEnrollments,
  enrollStudent,
  unenrollStudent,
  reassignEnrollment,
  searchStudentsForEnrollment,
  searchStudentsWithEnrollments,
  getStudentEnrollments,
  getSlotWaitlist,
  addToWaitlist,
  removeFromWaitlist,
  triggerWaitlistPromotion
} from "./actions-enrollment";

export {
  getSlotCheckins,
  closeClassAction,
  markAsAbsentAction,
  unmarkAsAbsentAction,
  deleteCheckinAction,
  migrateCheckinAction,
  manualCheckinAction,
  reopenClassAction
} from "./actions-checkin";

export {
  getSlotSubstitutions,
  addSubstitution,
  searchStudentsCoachAction
} from "./actions-coach";

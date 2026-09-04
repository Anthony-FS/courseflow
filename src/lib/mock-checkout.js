/** Temporary checkout payload until Subscribe → Payment is wired. */
export const MOCK_CHECKOUT = {
  courseId: "00000000-0000-0000-0000-000000000001",
  title: "Service Design Essentials Course",
  subtotal: 3559,
};

export function toSatang(amountThb) {
  return Math.round(Number(amountThb) * 100);
}

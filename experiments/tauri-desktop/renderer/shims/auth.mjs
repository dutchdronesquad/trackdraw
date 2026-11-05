import { toast } from "sonner";

const anonymous = { data: null, isPending: false, error: null };
const unavailable = async () => {
  toast.info("Accounts are outside this offline desktop POC.");
  throw new Error("Accounts are unavailable in the desktop POC.");
};
export function isDevAuthShimEnabled() {
  return false;
}
export const authClient = {
  useSession: () => anonymous,
  signOut: async () => {},
  updateProfileName: unavailable,
  deleteUser: unavailable,
  changeEmail: unavailable,
  passkey: {
    list: async () => [],
    add: unavailable,
    update: unavailable,
    remove: unavailable,
  },
};

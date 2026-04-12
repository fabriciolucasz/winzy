import { Suspense } from "react";
import { Login } from "../login-form";
import { getAuthUser } from "@/lib/auth/mddleware";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const authUser = await getAuthUser();

  if (authUser) {
    redirect("/dashboard");
  }

  return (
    <Suspense>
      <Login mode="register" />
    </Suspense>
  )
}
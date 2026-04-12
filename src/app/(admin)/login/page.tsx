import { Suspense } from "react";
import { Login } from "../login-form";
import { getAuthUser } from "@/lib/auth/mddleware";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const authUser = await getAuthUser();

  if (authUser) {
    redirect("/dashboard/organizations");
  }

  return (
    <Suspense>
      <Login mode="login" />
    </Suspense>
  )
}
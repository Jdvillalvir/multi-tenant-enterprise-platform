import UsersClient from "./UsersClient";import {requirePermission} from "@/lib/permissions/permissions";
export default async function Page(){await requirePermission("users.view");return <UsersClient/>}

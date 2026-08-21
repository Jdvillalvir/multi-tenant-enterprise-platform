import StoresClient from "./StoresClient";import {requirePermission} from "@/lib/permissions/permissions";
export default async function Page(){await requirePermission("stores.view");return <StoresClient/>}

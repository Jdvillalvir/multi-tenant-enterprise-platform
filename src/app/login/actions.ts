"use server";
import {signIn} from "@/auth";
import {AuthError} from "next-auth";
export async function loginAction(_:unknown,formData:FormData){try{await signIn("credentials",{email:String(formData.get("email")??""),password:String(formData.get("password")??""),redirectTo:"/dashboard"});return {error:"Credenciales inválidas."};}catch(e){if(e instanceof AuthError)return {error:"Credenciales inválidas."};throw e}}

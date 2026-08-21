import "./globals.css";
import type {Metadata} from "next";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Multi-Tenant Enterprise",description:"Plataforma empresarial multi-tienda con control de acceso y auditoría"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}

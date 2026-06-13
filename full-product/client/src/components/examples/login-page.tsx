import { LoginPage } from "../login-page";
import { ThemeProvider } from "../theme-provider";

export default function LoginPageExample() {
  return (
    <ThemeProvider>
      <LoginPage onLogin={(role) => console.log("Logged in as:", role)} />
    </ThemeProvider>
  );
}

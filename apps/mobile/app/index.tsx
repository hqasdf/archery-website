import { Redirect } from "expo-router";
import { useAuth } from "../src/auth";
import { authDestination } from "../src/auth-flow";

export default function Index() {
  const { user, recovery } = useAuth();
  const destination = authDestination(user, recovery);
  return <Redirect href={destination === "recover" ? "/recover" : destination === "sessions" ? "/(tabs)/sessions" : "/(auth)/sign-in"} />;
}

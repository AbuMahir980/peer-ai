import { WebView } from "react-native-webview";

interface Props {
  route: { params: { url: string } };
}

// Opens a lending partner's page from a shelf://scan?url=… link on a book's QR code.
export function ScanScreen({ route }: Props) {
  return <WebView source={{ uri: route.params.url }} javaScriptEnabled domStorageEnabled />;
}

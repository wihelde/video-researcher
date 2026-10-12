# Cloud Vision Web Detection für die Bildsuche

Status: ersetzt durch [ADR 0005](./0005-google-lens-browser-fallback.md).

Für den Reddit-MVP verwenden wir Google Cloud Vision Web Detection als automatisierte Rückwärtssuche. Ein gleichwertiger, offiziell dokumentierter und dauerhaft kostenloser API-Dienst ist nicht verfügbar; Cloud Vision bietet ein kostenloses Kontingent von 1.000 Web-Detection-Einheiten pro Monat. Die lokale Anwendung setzt zusätzlich ein hartes Nutzungslimit und weist darauf hin, dass die untersuchten Bilder an Google übertragen werden.

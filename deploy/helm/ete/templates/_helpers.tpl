{{- define "ete.labels" -}}
app.kubernetes.io/name: ete
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- define "ete.selector" -}}
app.kubernetes.io/name: ete
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

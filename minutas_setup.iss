; =====================================================================
; Script Inno Setup 6 para Minutas AI Studio (Instalador Universal Windows)
; Diseñado para ejecutarse en cualquier PC con Windows 10/11 sin permisos de admin
; =====================================================================

#define MyAppName "Minutas AI Studio"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "Minutas AI"
#define MyAppExeName "MinutasAI_Studio_Portable.exe"
#define SourceDir "C:\Users\DionicioFelipeFlores\Downloads\minutas2\desktop_app\dist\MinutasAI_Studio_Portable"

[Setup]
; Identificador único de la aplicación
AppId={{C8E64E3F-72A1-4B9F-8349-D8D3499E0F2B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL=https://generativedocs.local
AppSupportURL=https://generativedocs.local
AppUpdatesURL=https://generativedocs.local

; Instalación por usuario (sin requerir derechos de administrador)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Directorio de instalación estándar del usuario
DefaultDirName={localappdata}\Programs\MinutasAI_Studio
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Configuración del paquete y compresión
OutputDir=C:\Users\DionicioFelipeFlores\Downloads\minutas2
OutputBaseFilename=Instalador_MinutasAI_Studio
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible

; Apariencia moderna
WizardStyle=modern
DisableWelcomePage=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\_internal\*"; DestDir: "{app}\_internal"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

import os, sys, zipfile, base64, textwrap

if sys.stdout.encoding != 'utf-8':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

def build():
    workspace = r'C:\Users\DionicioFelipeFlores\Downloads\minutas2'
    zip_path  = os.path.join(workspace, 'payload_installer.zip')

    print(f"[1/3] Leyendo ZIP ({os.path.getsize(zip_path)/1024/1024:.1f} MB)...")
    with open(zip_path, 'rb') as f:
        zip_bytes = f.read()

    print(f"[2/3] Codificando Base64...")
    b64 = base64.b64encode(zip_bytes).decode('ascii')

    # El script PowerShell completo de instalacion - se pasa como archivo separado
    # El .bat solo extrae el PS1 y lo llama
    # El ZIP codificado se escribe via PowerShell directamente (mucho mas rapido que echo linea a linea)

    # Dividir b64 en chunks de 8000 chars para concatenacion eficiente
    chunk_size = 8000
    chunks = [b64[i:i+chunk_size] for i in range(0, len(b64), chunk_size)]
    print(f"  {len(chunks)} chunks de {chunk_size} chars")

    ps_installer = r"""
param([string]$SetupDir)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$installDir = Join-Path $env:LOCALAPPDATA 'MinutasAI_Studio'
$mainExe    = Join-Path $installDir 'MinutasAI_Studio_Portable.exe'
$b64file    = Join-Path $SetupDir 'payload.b64'
$zipFile    = Join-Path $SetupDir 'payload.zip'

# Si ya instalado, lanzar y salir
if (Test-Path $mainExe) {
    Start-Process -FilePath $mainExe -WorkingDirectory $installDir
    exit 0
}

# GUI de instalacion
$form = New-Object Windows.Forms.Form
$form.Text = 'Minutas AI Studio'
$form.Size = New-Object Drawing.Size(480,300)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.BackColor = [Drawing.Color]::FromArgb(15,23,42)

function AddLabel($t,$fs,$fw,$fc,$x,$y,$w,$h) {
    $l = New-Object Windows.Forms.Label
    $l.Text = $t
    $l.Font = New-Object Drawing.Font('Segoe UI',$fs,[Drawing.FontStyle]::$fw)
    $l.ForeColor = $fc
    $l.Location = New-Object Drawing.Point($x,$y)
    if ($w -gt 0) { $l.Size = New-Object Drawing.Size($w,$h) } else { $l.AutoSize = $true }
    $form.Controls.Add($l)
    return $l
}

AddLabel 'Minutas AI Studio' 20 Bold ([Drawing.Color]::White) 25 18 0 0 | Out-Null
AddLabel 'Instalador automatico para Windows' 9 Regular ([Drawing.Color]::FromArgb(148,163,184)) 25 55 425 22 | Out-Null

$bar = New-Object Windows.Forms.ProgressBar
$bar.Location = New-Object Drawing.Point(28,130)
$bar.Size = New-Object Drawing.Size(410,14)
$bar.Visible = $false
$form.Controls.Add($bar)

$stat = New-Object Windows.Forms.Label
$stat.Text = 'Listo para instalar.'
$stat.Font = New-Object Drawing.Font('Segoe UI',9)
$stat.ForeColor = [Drawing.Color]::FromArgb(100,116,139)
$stat.Location = New-Object Drawing.Point(28,150)
$stat.Size = New-Object Drawing.Size(410,22)
$form.Controls.Add($stat)

$btn = New-Object Windows.Forms.Button
$btn.Text = 'Instalar Ahora'
$btn.Font = New-Object Drawing.Font('Segoe UI',12,[Drawing.FontStyle]::Bold)
$btn.BackColor = [Drawing.Color]::FromArgb(37,99,235)
$btn.ForeColor = [Drawing.Color]::White
$btn.FlatStyle = 'Flat'
$btn.Location = New-Object Drawing.Point(28,184)
$btn.Size = New-Object Drawing.Size(410,46)
$btn.FlatAppearance.BorderSize = 0
$form.Controls.Add($btn)

$btn.Add_Click({
    $btn.Enabled = $false
    $bar.Visible = $true

    $rsState = [hashtable]::Synchronized(@{
        installDir = $installDir; mainExe = $mainExe
        b64file = $b64file; zipFile = $zipFile
        form = $form; bar = $bar; stat = $stat; btn = $btn
    })

    $rs = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace()
    $rs.ApartmentState = 'STA'
    $rs.Open()
    $rs.SessionStateProxy.SetVariable('s', $rsState)

    $ps = [System.Management.Automation.PowerShell]::Create()
    $ps.Runspace = $rs
    [void]$ps.AddScript({
        try {
            $s.form.Invoke([Action]{ $s.stat.Text='Decodificando paquete...'; $s.bar.Value=15 })
            certutil -decode $s.b64file $s.zipFile | Out-Null

            $s.form.Invoke([Action]{ $s.stat.Text='Preparando directorio...'; $s.bar.Value=25 })
            if (Test-Path $s.installDir){ Remove-Item -Recurse -Force $s.installDir }
            New-Item -ItemType Directory -Force -Path $s.installDir | Out-Null

            $s.form.Invoke([Action]{ $s.stat.Text='Extrayendo archivos (puede tardar 1-2 min)...'; $s.bar.Value=30 })
            [IO.Compression.ZipFile]::ExtractToDirectory($s.zipFile, $s.installDir)
            Remove-Item $s.zipFile -Force -ErrorAction SilentlyContinue

            $s.form.Invoke([Action]{ $s.stat.Text='Desbloqueando archivos extraidos...'; $s.bar.Value=85 })
            Get-ChildItem $s.installDir -Recurse -File | Unblock-File -ErrorAction SilentlyContinue

            $s.form.Invoke([Action]{ $s.stat.Text='Creando acceso directo en Escritorio...'; $s.bar.Value=93 })
            $wsh = New-Object -ComObject WScript.Shell
            $lnk = $wsh.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Minutas AI Studio.lnk'))
            $lnk.TargetPath = $s.mainExe; $lnk.WorkingDirectory = $s.installDir; $lnk.Save()

            $s.form.Invoke([Action]{ $s.bar.Value=100; $s.stat.Text='Instalacion completada.' })
            Start-Sleep -Milliseconds 600

            $s.form.Invoke([Action]{
                [Windows.Forms.MessageBox]::Show(
                    "Minutas AI Studio instalado correctamente.`n`nIcono creado en tu Escritorio.",
                    'Instalacion Completada','OK','Information')
                Start-Process $s.mainExe -WorkingDirectory $s.installDir
                $s.form.Close()
            })
        } catch {
            $err = $_.Exception.Message
            $s.form.Invoke([Action]{
                $s.btn.Enabled = $true
                $s.stat.Text = 'Error durante instalacion.'
                [Windows.Forms.MessageBox]::Show("Error:`n$err",'Error','OK','Error')
            })
        }
    })
    [void]$ps.BeginInvoke()
})

[Windows.Forms.Application]::Run($form)
"""

    print("[3/3] Generando Instalar_MinutasAI_Studio.bat (optimizado)...")

    bat_out = os.path.join(workspace, 'Instalar_MinutasAI_Studio.bat')
    with open(bat_out, 'w', encoding='utf-8') as f:
        f.write('@echo off\n')
        f.write('setlocal enabledelayedexpansion\n')
        f.write('chcp 65001 > nul\n')
        f.write('title Minutas AI Studio - Instalador\n')
        f.write('cls\n')
        f.write('echo.\n')
        f.write('echo   =========================================\n')
        f.write('echo     Minutas AI Studio - Preparando...\n')
        f.write('echo   =========================================\n')
        f.write('echo.\n\n')
        
        f.write(':: Directorio temporal unico\n')
        f.write('set "SD=%TEMP%\\MinutasAI_%RANDOM%_%RANDOM%"\n')
        f.write('mkdir "%SD%" 2>nul\n\n')
        
        f.write('echo Escribiendo paquete de datos (puede tardar unos segundos)...\n\n')
        
        # Usar PowerShell para escribir el b64 eficientemente
        # Dividimos en archivos parciales y los concatenamos para evitar
        # el limite de variables de entorno de CMD (8192 chars por variable)
        
        # Estrategia: escribir el b64 directamente desde un heredoc PowerShell
        # PowerShell puede escribir en un archivo sin limite de linea
        f.write('powershell -NoProfile -ExecutionPolicy Bypass -Command "\n')
        f.write('$f = [System.IO.File]::CreateText(\'%SD%\\\\payload.b64\')\n')
        
        # Escribir en bloques de 8000 chars via PS
        for i, chunk in enumerate(chunks):
            f.write(f'$f.Write(\'{chunk}\')\n')
            if i % 100 == 99:
                # Flush periodicamente para no sobrecargar memoria
                f.write('$f.Flush()\n')
        
        f.write('$f.Close()\n')
        f.write('"\n\n')
        
        # Escribir el PS1 installer
        f.write(':: Escribir el instalador PowerShell\n')
        f.write('powershell -NoProfile -ExecutionPolicy Bypass -Command "\n')
        f.write('$script = @\'\n')
        f.write(ps_installer.strip())
        f.write('\n\'@\n')
        f.write('[System.IO.File]::WriteAllText(\'%SD%\\\\install.ps1\', $script)\n')
        f.write('"\n\n')
        
        f.write(':: Ejecutar instalador con GUI\n')
        f.write('echo Iniciando instalador...\n')
        f.write('powershell -NoProfile -ExecutionPolicy Bypass -STA -File "%SD%\\install.ps1" -SetupDir "%SD%"\n\n')
        
        f.write(':: Limpiar temporales\n')
        f.write('rmdir /s /q "%SD%" 2>nul\n')
        f.write('endlocal\n')

    bat_size = os.path.getsize(bat_out) / 1024 / 1024
    print(f"\n  [OK] {bat_out}")
    print(f"  Tamano: {bat_size:.1f} MB")
    print()
    print("ARCHIVO LISTO: Instalar_MinutasAI_Studio.bat")
    print("-> Llevalo al otro PC y haz doble clic")
    print("-> cmd.exe (sistema de Windows) lo ejecuta SIN bloqueos")

if __name__ == '__main__':
    build()

using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading;
using System.Runtime.InteropServices;

// =====================================================================
// Instalador Autónomo Minutas AI Studio
// Compilado con C# 5 (.NET Framework 4.0) para máxima compatibilidad
// =====================================================================

class Program
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern bool DeleteFile(string name);

    static void Unblock(string path)
    {
        try { DeleteFile(path + ":Zone.Identifier"); }
        catch { }
    }

    [STAThread]
    static void Main()
    {
        // Desbloquear este mismo instalador antes de cualquier acción
        string self = System.Windows.Forms.Application.ExecutablePath;
        Unblock(self);

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        string installDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "MinutasAI_Studio"
        );

        // Si ya está instalado, lanzarlo directamente
        string mainExe = Path.Combine(installDir, "MinutasAI_Studio_Portable.exe");
        if (File.Exists(mainExe))
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = mainExe;
                psi.WorkingDirectory = installDir;
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error al iniciar la aplicacion:\n" + ex.Message,
                    "Minutas AI Studio",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            return;
        }

        Application.Run(new InstallerForm(installDir));
    }
}

class InstallerForm : Form
{
    private string _dir;
    private Label lblTitle;
    private Label lblSub;
    private Label lblStatus;
    private ProgressBar bar;
    private Button btnGo;
    private CheckBox chkDesktop;
    private CheckBox chkLaunch;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern bool DeleteFile(string name);

    static void Unblock(string path)
    {
        try { DeleteFile(path + ":Zone.Identifier"); }
        catch { }
    }

    public InstallerForm(string installDir)
    {
        _dir = installDir;
        BuildUI();
    }

    private void BuildUI()
    {
        this.Text = "Minutas AI Studio - Instalador";
        this.Size = new Size(500, 370);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.BackColor = Color.FromArgb(15, 23, 42);

        lblTitle = new Label();
        lblTitle.Text = "Minutas AI Studio";
        lblTitle.Font = new Font("Segoe UI", 22f, FontStyle.Bold);
        lblTitle.ForeColor = Color.White;
        lblTitle.Location = new Point(28, 20);
        lblTitle.AutoSize = true;
        this.Controls.Add(lblTitle);

        lblSub = new Label();
        lblSub.Text = "Instalador autonomo - sin dependencias externas";
        lblSub.Font = new Font("Segoe UI", 10f);
        lblSub.ForeColor = Color.FromArgb(148, 163, 184);
        lblSub.Location = new Point(28, 60);
        lblSub.Size = new Size(440, 22);
        this.Controls.Add(lblSub);

        chkDesktop = new CheckBox();
        chkDesktop.Text = "Crear acceso directo en el Escritorio";
        chkDesktop.Checked = true;
        chkDesktop.ForeColor = Color.FromArgb(203, 213, 225);
        chkDesktop.Location = new Point(32, 105);
        chkDesktop.AutoSize = true;
        this.Controls.Add(chkDesktop);

        chkLaunch = new CheckBox();
        chkLaunch.Text = "Iniciar la aplicacion al finalizar";
        chkLaunch.Checked = true;
        chkLaunch.ForeColor = Color.FromArgb(203, 213, 225);
        chkLaunch.Location = new Point(32, 133);
        chkLaunch.AutoSize = true;
        this.Controls.Add(chkLaunch);

        bar = new ProgressBar();
        bar.Location = new Point(30, 180);
        bar.Size = new Size(428, 14);
        bar.Visible = false;
        bar.Style = ProgressBarStyle.Continuous;
        this.Controls.Add(bar);

        lblStatus = new Label();
        lblStatus.Text = "Listo para instalar.";
        lblStatus.Font = new Font("Segoe UI", 9f);
        lblStatus.ForeColor = Color.FromArgb(100, 116, 139);
        lblStatus.Location = new Point(28, 202);
        lblStatus.Size = new Size(440, 22);
        this.Controls.Add(lblStatus);

        btnGo = new Button();
        btnGo.Text = "Instalar Ahora";
        btnGo.Font = new Font("Segoe UI", 12f, FontStyle.Bold);
        btnGo.BackColor = Color.FromArgb(37, 99, 235);
        btnGo.ForeColor = Color.White;
        btnGo.FlatStyle = FlatStyle.Flat;
        btnGo.Location = new Point(30, 243);
        btnGo.Size = new Size(428, 48);
        btnGo.Cursor = Cursors.Hand;
        btnGo.FlatAppearance.BorderSize = 0;
        btnGo.Click += new EventHandler(OnInstallClick);
        this.Controls.Add(btnGo);
    }

    private void OnInstallClick(object sender, EventArgs e)
    {
        btnGo.Enabled = false;
        bar.Visible = true;
        Thread t = new Thread(new ThreadStart(DoInstall));
        t.IsBackground = true;
        t.Start();
    }

    private void SetUI(int progress, string status)
    {
        if (this.InvokeRequired)
        {
            this.Invoke(new Action<int, string>(SetUI), progress, status);
            return;
        }
        bar.Value = progress;
        lblStatus.Text = status;
    }

    private void DoInstall()
    {
        try
        {
            if (Directory.Exists(_dir))
                Directory.Delete(_dir, true);
            Directory.CreateDirectory(_dir);

            SetUI(15, "Buscando paquete de instalacion...");

            Assembly asm = Assembly.GetExecutingAssembly();
            string[] names = asm.GetManifestResourceNames();
            string resName = null;
            for (int i = 0; i < names.Length; i++)
            {
                if (names[i].EndsWith(".zip"))
                {
                    resName = names[i];
                    break;
                }
            }

            if (resName == null)
            {
                string all = string.Join(", ", names);
                throw new Exception("Paquete no encontrado. Recursos: " + all);
            }

            SetUI(25, "Extrayendo archivos...");

            using (Stream rs = asm.GetManifestResourceStream(resName))
            {
                using (ZipArchive arc = new ZipArchive(rs, ZipArchiveMode.Read))
                {
                    int total = arc.Entries.Count;
                    int done = 0;
                    foreach (ZipArchiveEntry entry in arc.Entries)
                    {
                        done++;
                        if (done % 100 == 0)
                        {
                            int pct = 25 + (int)((double)done / total * 60);
                            SetUI(pct, "Extrayendo " + done + " / " + total + " archivos...");
                        }

                        string rel = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                        string dest = Path.Combine(_dir, rel);

                        if (entry.FullName.EndsWith("/") || entry.FullName.EndsWith("\\"))
                        {
                            Directory.CreateDirectory(dest);
                        }
                        else
                        {
                            string pd = Path.GetDirectoryName(dest);
                            if (pd != null && !Directory.Exists(pd))
                                Directory.CreateDirectory(pd);
                            entry.ExtractToFile(dest, true);
                        }
                    }
                }
            }

            SetUI(88, "Desbloqueando archivos extraidos...");

            // CRITICO: eliminar Zone.Identifier de CADA archivo para evitar bloqueos en otros PCs
            string[] extracted = Directory.GetFiles(_dir, "*", SearchOption.AllDirectories);
            for (int i = 0; i < extracted.Length; i++)
                Unblock(extracted[i]);

            SetUI(94, "Creando acceso directo...");

            string appExe = Path.Combine(_dir, "MinutasAI_Studio_Portable.exe");
            if (!File.Exists(appExe))
            {
                string[] exes = Directory.GetFiles(_dir, "*.exe", SearchOption.TopDirectoryOnly);
                if (exes.Length > 0) appExe = exes[0];
                else appExe = null;
            }

            bool desk = true;
            bool launch = true;
            this.Invoke(new Action(delegate {
                desk = chkDesktop.Checked;
                launch = chkLaunch.Checked;
            }));

            if (desk && appExe != null)
            {
                string lnk = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
                    "Minutas AI Studio.lnk"
                );
                MakeShortcut(lnk, appExe, _dir);
            }

            SetUI(100, "Instalacion completada.");

            string finalExe = appExe;
            bool doLaunch = launch;
            this.Invoke(new Action(delegate {
                MessageBox.Show(
                    "Minutas AI Studio se instalo correctamente.\n\nAbre la aplicacion desde el icono en tu Escritorio.",
                    "Instalacion Completada",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
                if (doLaunch && finalExe != null)
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = finalExe;
                        psi.WorkingDirectory = _dir;
                        psi.UseShellExecute = true;
                        Process.Start(psi);
                    }
                    catch { }
                }
                this.Close();
            }));
        }
        catch (Exception ex)
        {
            string msg = ex.Message;
            this.Invoke(new Action(delegate {
                btnGo.Enabled = true;
                lblStatus.Text = "Error en la instalacion.";
                MessageBox.Show("Error:\n\n" + msg, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }));
        }
    }

    private void MakeShortcut(string lnkPath, string target, string workDir)
    {
        try
        {
            string vbs = Path.Combine(Path.GetTempPath(), "ms_lnk_minutas.vbs");
            string script =
                "Set s=CreateObject(\"WScript.Shell\")\n" +
                "Set l=s.CreateShortcut(\"" + lnkPath.Replace("\\", "\\\\") + "\")\n" +
                "l.TargetPath=\"" + target.Replace("\\", "\\\\") + "\"\n" +
                "l.WorkingDirectory=\"" + workDir.Replace("\\", "\\\\") + "\"\n" +
                "l.Description=\"Minutas AI Studio\"\n" +
                "l.Save\n";
            File.WriteAllText(vbs, script);
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "wscript.exe";
            psi.Arguments = "\"" + vbs + "\"";
            psi.UseShellExecute = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            Process.Start(psi);
        }
        catch { }
    }
}

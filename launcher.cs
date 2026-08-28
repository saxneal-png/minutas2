using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;

class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        try
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            
            string pythonw = Path.Combine(baseDir, "runtime", "pythonw.exe");
            string script = Path.Combine(baseDir, "app", "main.py");

            if (!File.Exists(pythonw))
            {
                pythonw = Path.Combine(baseDir, "desktop_app", "runtime", "pythonw.exe");
            }
            if (!File.Exists(script))
            {
                script = Path.Combine(baseDir, "desktop_app", "main.py");
            }

            if (!File.Exists(pythonw))
            {
                // Try system pythonw as last fallback
                pythonw = "pythonw.exe";
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = pythonw;
            psi.Arguments = "\"" + script + "\"";
            psi.WorkingDirectory = Path.GetDirectoryName(script);
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;

            Process.Start(psi);
        }
        catch (Exception ex)
        {
            MessageBox.Show("Error iniciando Minutas AI: " + ex.Message, "Minutas AI", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}

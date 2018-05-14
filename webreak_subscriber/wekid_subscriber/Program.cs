using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace wekid_subscriber
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("press any key");
            Console.Read();

            var process = new Process
            {
                StartInfo =
                {
                    FileName = "chrome.exe",
                    Arguments = "http://wx.qq.com",
                    WindowStyle = ProcessWindowStyle.Normal
                }
            };

            /*
            // all the existing chrome processes
            var oldPIds = Process.GetProcessesByName("chrome").Select(p => p.Id).ToArray();
            process.Start();
            var newProcesses = Process.GetProcessesByName("chrome").Select(p => new {p.Id, p.MainWindowHandle})
                                .ToDictionary(p => p.Id, p => p.MainWindowHandle);

            IntPtr handle = new IntPtr();
            foreach (var key in newProcesses.Keys)
            {
                for (int j = 0; j < oldPIds.Count(); j++)
                {
                    if (oldPIds[j] != key)
                    {
                        handle = newProcesses[key];
                        goto Found;
                        break;
                    }
                }
            }

    Found:
             * */

            process.Start();
            Thread.Sleep(10*1000);
            var image = ScreenCapture.CaptureActiveWindow();
            image.Save(@"c:/temp/chrome.png", ImageFormat.Png);

            SendKeys.SendWait("{F12}");
            SendKeys.Flush();
        }
    }

    public class ScreenCapture
    {
        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", CharSet = CharSet.Auto, ExactSpelling = true)]
        public static extern IntPtr GetDesktopWindow();

        [StructLayout(LayoutKind.Sequential)]
        private struct Rect
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [DllImport("user32.dll")]
        private static extern IntPtr GetWindowRect(IntPtr hWnd, ref Rect rect);

        [DllImport("user32.dll", SetLastError = true)]
        static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int Width, int Height, bool Repaint);

        public static Image CaptureDesktop()
        {
            return CaptureWindow(GetDesktopWindow());
        }

        public static Bitmap CaptureActiveWindow()
        {
            return CaptureWindow(GetForegroundWindow());
        }

        public static Bitmap CaptureWindow(IntPtr handle)
        {
            MoveWindow(handle, 100, 100, 600, 600, true);
            Thread.Sleep(1000); // UI may have some delay
            var rect = new Rect();
            GetWindowRect(handle, ref rect);
            var bounds = new Rectangle(rect.Left + 60, rect.Top + 80, 460, 460);
            var result = new Bitmap(bounds.Width, bounds.Height);

            using (var graphics = Graphics.FromImage(result))
            {
                graphics.CopyFromScreen(new Point(bounds.Left, bounds.Top), Point.Empty, bounds.Size);
            }

            return result;
        }
    }
}

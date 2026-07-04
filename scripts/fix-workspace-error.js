const fs = require('fs');

let file = fs.readFileSync('src/components/reports/reports-workspace.tsx', 'utf8');

file = file.replace(
  `    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi tạo báo cáo");
    } finally {`,
  `    } catch (error) {
      console.error(error);
      const err = error as Error;
      toast.error(err.message || "Đã xảy ra lỗi không mong muốn khi tạo báo cáo");
    } finally {`
);

fs.writeFileSync('src/components/reports/reports-workspace.tsx', file);
